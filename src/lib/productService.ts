import { PRODUCTS, Product, Category } from '../data/products';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_PRODUCTS_KEY = 'sandrino_products_catalog';

const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PRODUCT_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function readLocalProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      return [];
    }
  } catch {
    // ignore storage parse error
  }
  return null;
}

function writeLocalProducts(list: Product[]): void {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota error
  }
}

async function getAccessToken(): Promise<string | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return undefined;

    if (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session?.access_token) {
        return refreshed.session.access_token;
      }
    }
    return session.access_token;
  } catch {
    return undefined;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Impossible de lire les données du fichier.'));
    reader.readAsDataURL(blob);
  });
}

function mapRowToProduct(row: any): Product {
  return {
    id: String(row.id),
    name: row.name,
    category: (row.category || 'Guides pratiques') as Category,
    shortDescription: row.short_description || '',
    fullDescription: row.full_description || '',
    price: Number(row.price) || 0,
    image: row.image || '/src/assets/images/shop_banner_learning_resources_1794250357467.jpg',
    format: row.format || 'PDF',
    whatWillYouLearn: Array.isArray(row.what_will_you_learn) ? row.what_will_you_learn : [],
    advantages: Array.isArray(row.advantages) ? row.advantages : [],
    fileUrl: row.file_url || undefined,
    filePath: row.file_path || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size != null ? Number(row.file_size) : undefined
  };
}

export const productService = {
  getProductsSync(): Product[] {
    const local = readLocalProducts();
    return local !== null ? local : PRODUCTS;
  },

  async getProducts(): Promise<Product[]> {
    // 1. Try Supabase public.products table if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map(mapRowToProduct);
          writeLocalProducts(mapped);
          return mapped;
        }
      } catch {
        // Table may not exist yet; continue to Express API / local fallback
      }
    }

    // 2. Try Express server catalog (/api/products) with cache disabled
    try {
      const res = await fetch('/api/products', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.products) && json.products.length > 0) {
          if (json.isCustomCatalog) {
            writeLocalProducts(json.products);
            return json.products;
          }
          // Server still only has default seed: preserve any local admin edits if present
          const local = readLocalProducts();
          if (local !== null) {
            return local;
          }
          return json.products;
        }
      }
    } catch {
      // Fallback gracefully
    }

    // 3. Fallback to localStorage or default catalog
    const local = readLocalProducts();
    return local !== null ? local : PRODUCTS;
  },

  async saveProduct(product: Product, isNew: boolean, currentList?: Product[]): Promise<Product[]> {
    const baseList = currentList ?? this.getProductsSync();
    const updatedList = isNew
      ? [product, ...baseList]
      : baseList.map(p => (p.id === product.id ? product : p));

    writeLocalProducts(updatedList);

    let supabaseOk = false;
    let serverOk = false;
    let lastError: string | null = null;

    // 1. Persist to Supabase products table if available
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('products').upsert(
          {
            id: product.id,
            name: product.name,
            category: product.category,
            short_description: product.shortDescription,
            full_description: product.fullDescription,
            price: product.price,
            image: product.image,
            format: product.format,
            what_will_you_learn: product.whatWillYouLearn || [],
            advantages: product.advantages || [],
            file_url: product.fileUrl || null,
            file_path: product.filePath || null,
            file_name: product.fileName || null,
            file_size: product.fileSize ?? null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
        if (!error) {
          supabaseOk = true;
        } else {
          lastError = error.message;
        }
      } catch (err: any) {
        lastError = err?.message || null;
      }
    }

    // 2. Sync product to Express server catalog so public pages (/shop, /checkout) immediately see it
    try {
      const accessToken = await getAccessToken();
      const res = await fetch('/api/products/upsert', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product,
          isNew,
          ...(accessToken ? { accessToken } : {})
        })
      });

      if (res.ok) {
        serverOk = true;
      } else {
        const errJson = await res.json().catch(() => null);
        lastError = errJson?.error || `Erreur serveur (HTTP ${res.status}) lors de la publication du produit.`;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }

    if (!supabaseOk && !serverOk && lastError) {
      throw new Error(lastError);
    }

    return updatedList;
  },

  async deleteProduct(productId: string, currentList?: Product[]): Promise<Product[]> {
    const baseList = currentList ?? this.getProductsSync();
    const updatedList = baseList.filter(p => p.id !== productId);
    writeLocalProducts(updatedList);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').delete().eq('id', productId);
      } catch {
        // Ignore if table doesn't exist yet
      }
    }

    try {
      const accessToken = await getAccessToken();
      await fetch('/api/products/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          ...(accessToken ? { accessToken } : {})
        })
      });
    } catch {
      // Non-blocking
    }

    return updatedList;
  },

  async uploadProductCover(
    file: File,
    productId: string
  ): Promise<{ url: string; fileName: string; size: number }> {
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      throw new Error('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP ou GIF).');
    }
    if (file.size > MAX_COVER_BYTES) {
      throw new Error("L'image de couverture dépasse la taille maximale autorisée (10 Mo).");
    }

    // Optimize oversized cover images (> 500 KB) cleanly to stay well below proxy/JSON limits
    let uploadBlob: Blob = file;
    if (file.size > 500 * 1024 && typeof document !== 'undefined') {
      try {
        const bitmapUrl = URL.createObjectURL(file);
        const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = bitmapUrl;
        });
        URL.revokeObjectURL(bitmapUrl);

        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(imgEl.width, imgEl.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imgEl.width * scale));
        canvas.height = Math.max(1, Math.round(imgEl.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
          let compressed = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.85)
          );
          if (compressed && compressed.size > 550 * 1024) {
            compressed = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.72)
            );
          }
          if (compressed && compressed.size < file.size) {
            uploadBlob = compressed;
          }
        }
      } catch {
        // Keep original file if canvas optimization fails
      }
    }

    const safeName = sanitizeFilename(file.name);
    const storagePath = `covers/${productId}_${Date.now()}_${safeName}`;

    // 1. Try Supabase Storage public bucket 'product-covers'
    if (isSupabaseConfigured) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('product-covers')
          .upload(storagePath, uploadBlob, { upsert: true, contentType: uploadBlob.type || file.type });

        if (!uploadError) {
          const { data: pub } = supabase.storage
            .from('product-covers')
            .getPublicUrl(storagePath);

          if (pub?.publicUrl) {
            return {
              url: pub.publicUrl,
              fileName: file.name,
              size: uploadBlob.size
            };
          }
        }
      } catch {
        // Fall through to Express upload endpoint
      }
    }

    // 2. Upload to Express server (/api/uploads/product-cover) using standard JSON/Base64
    try {
      const accessToken = await getAccessToken();
      const imageBase64 = await blobToBase64(uploadBlob);
      const res = await fetch('/api/uploads/product-cover', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          fileName: file.name,
          mimeType: uploadBlob.type || file.type || 'image/jpeg',
          imageBase64,
          ...(accessToken ? { accessToken } : {})
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          return {
            url: json.url,
            fileName: json.fileName || file.name,
            size: Number(json.size) || uploadBlob.size
          };
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error) throw new Error(errJson.error);
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }

    // 3. Offline browser Data URL fallback
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée."));
      reader.readAsDataURL(uploadBlob);
    });

    return {
      url: dataUrl,
      fileName: file.name,
      size: uploadBlob.size
    };
  },

  async uploadProductFile(
    file: File,
    productId: string,
    onProgress?: (percent: number) => void
  ): Promise<{
    filePath: string;
    fileUrl: string;
    fileName: string;
    size: number;
    format: string;
  }> {
    if (file.size === 0) {
      throw new Error('Le fichier sélectionné est vide.');
    }
    if (file.size > MAX_PRODUCT_FILE_BYTES) {
      throw new Error('Le fichier du produit dépasse la taille maximale autorisée (100 Mo).');
    }

    const safeName = sanitizeFilename(file.name);
    const ext = (safeName.split('.').pop() || 'PDF').toUpperCase();
    const detectedFormat = ext === 'JPG' || ext === 'JPEG' || ext === 'PNG' ? 'Image' : ext;
    const supabasePath = `products/${productId}/${safeName}`;

    let uploadedToSupabase = false;
    let serverDownloadUrl = `/api/products/${encodeURIComponent(productId)}/download`;
    let finalFilePath = supabasePath;

    onProgress?.(5);

    // 1. Try Supabase private bucket 'digital-products'
    if (isSupabaseConfigured) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('digital-products')
          .upload(supabasePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream'
          });

        if (!uploadError) {
          uploadedToSupabase = true;
          onProgress?.(50);
        }
      } catch {
        // Continue to chunked Express upload
      }
    }

    // 2. Upload to Express private products storage via 128 KB chunks as JSON/Base64
    // (~171 KB JSON payload per chunk: passes strict proxies/Cloud Run/WAF and Nginx limits cleanly)
    const CHUNK_SIZE = 128 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const accessToken = await getAccessToken();
      let lastResult: any = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);
        const chunkBase64 = await blobToBase64(chunkBlob);

        const res = await fetch('/api/uploads/product-file-chunk', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uploadId,
            chunkIndex,
            totalChunks,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            productId,
            chunkBase64,
            ...(accessToken ? { accessToken } : {})
          })
        });

        if (!res.ok) {
          const rawBody = await res.text().catch(() => '');
          let errJson: any = null;
          try {
            errJson = rawBody ? JSON.parse(rawBody) : null;
          } catch {
            errJson = null;
          }
          const errMsg =
            errJson?.error ||
            `Erreur serveur (HTTP ${res.status}) lors du téléversement du fichier.`;
          if (!uploadedToSupabase) {
            throw new Error(errMsg);
          }
          break;
        }

        lastResult = await res.json().catch(() => null);
        const basePct = uploadedToSupabase ? 50 : 10;
        onProgress?.(Math.min(100, Math.round(basePct + ((chunkIndex + 1) / totalChunks) * (100 - basePct))));
      }

      if (lastResult?.completed) {
        finalFilePath = lastResult.filePath || finalFilePath;
        serverDownloadUrl = lastResult.fileUrl || serverDownloadUrl;
        onProgress?.(100);
        return {
          filePath: finalFilePath,
          fileUrl: serverDownloadUrl,
          fileName: lastResult.fileName || file.name,
          size: Number(lastResult.size) || file.size,
          format: lastResult.format || detectedFormat
        };
      }
    } catch (err: any) {
      if (!uploadedToSupabase) {
        throw new Error(err?.message || "Impossible de téléverser le fichier du produit.");
      }
    }

    onProgress?.(100);
    return {
      filePath: finalFilePath,
      fileUrl: serverDownloadUrl,
      fileName: file.name,
      size: file.size,
      format: detectedFormat
    };
  },

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  }
};
