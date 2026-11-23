const SUPABASE_URL = "https://afqouvmzzmvtpnowvlbr.supabase.co";
const SUPABASE_KEY = "sb_publishable_QEgvd_gidrKKx9GvVZrlCQ_vG282Mdr";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeImage(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

async function rows(table, filters) {
  const endpoint = new URL(SUPABASE_URL + "/rest/v1/" + table);
  for (const [key, value] of Object.entries(filters)) {
    endpoint.searchParams.set(key, value);
  }
  const response = await fetch(endpoint.toString(), {
    headers: {
      apikey: SUPABASE_KEY
    }
  });
  if (!response.ok) throw new Error("Catalogue data could not be loaded.");
  return response.json();
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const slug = String(context.params.slug || "");
  const code = String(context.params.code || "").toUpperCase();

  try {
    const businesses = await rows("businesses", {
      select: "id,name,slug,description,whatsapp_number,is_published,business_location,delivery_locations,delivery_time,delivery_info,payment_terms",
      slug: "eq." + slug,
      is_published: "eq.true",
      limit: "1"
    });
    const business = businesses[0];
    if (!business) return new Response("Catalogue not found.", { status: 404 });

    const products = await rows("products", {
      select: "name,product_code,price,description,image_url,image_urls,is_active,availability_status",
      business_id: "eq." + business.id,
      product_code: "eq." + code,
      is_active: "eq.true",
      limit: "1"
    });
    const product = products[0];
    if (!product) return new Response("Product not found.", { status: 404 });

    const images = Array.isArray(product.image_urls) ? product.image_urls : [];
    const image = safeImage(images[0] || product.image_url);
    const title = product.name + " | " + business.name;
    const description = (product.description || "View product details and order from " + business.name).slice(0, 190);
    const canonical = requestUrl.origin + "/p/" + encodeURIComponent(slug) + "/" + encodeURIComponent(code);
    const storeLink = requestUrl.origin + "/?store=" + encodeURIComponent(slug);
    const price = "₦" + Number(product.price || 0).toLocaleString("en-NG");
    const number = String(business.whatsapp_number || "").replace(/\D/g, "");
    const stockLabel = { in_stock: "In stock", out_of_stock: "Out of stock", available_on_request: "Available on request" }[product.availability_status] || "";
    const businessDetails = [business.business_location && "Business location: " + business.business_location, business.delivery_locations && "Delivery locations: " + business.delivery_locations, business.delivery_time && "Delivery timeframe: " + business.delivery_time, business.delivery_info && "Delivery: " + business.delivery_info, business.payment_terms && "Payment: " + business.payment_terms].filter(Boolean).join("\n");
    const message = "Hello, I am interested in ordering this product.\nBusiness: " + business.name +
      "\nProduct: " + product.name + "\nCode: " + code + "\nPrice: " + price +
      (stockLabel ? "\nAvailability: " + stockLabel : "") + (businessDetails ? "\n" + businessDetails : "") + "\n" + canonical;
    const orderLink = number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(message) : "";

    const galleryItems = [product.image_url, ...images].filter((item, index, list) =>
      item && list.indexOf(item) === index
    );
    const gallery = galleryItems.map((item, index) => {
      const src = safeImage(item);
      return src
        ? '<img src="' + esc(src) + '" alt="' + esc(product.name) + ' photo ' + (index + 1) + '" loading="lazy">'
        : "";
    }).join("");
    const imageMeta = image ? '<meta property="og:image" content="' + esc(image) + '">' : "";

    const page = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(title) + '</title>' +
      '<meta name="description" content="' + esc(description) + '">' +
      '<link rel="canonical" href="' + esc(canonical) + '">' +
      '<meta property="og:type" content="product">' +
      '<meta property="og:title" content="' + esc(title) + '">' +
      '<meta property="og:description" content="' + esc(description) + '">' +
      '<meta property="og:url" content="' + esc(canonical) + '">' + imageMeta +
      '<meta property="og:image:alt" content="' + esc(product.name) + '">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="theme-color" content="#ffffff">' +
      '<style>body{font:16px/1.5 Arial,sans-serif;color:#111827;margin:0;background:#fff}' +
      'main{max-width:760px;margin:28px auto;padding:0 16px}.brand{font-weight:900;color:#128c4a;letter-spacing:.4px}' +
      '.box{border:1px solid #e5e7eb;border-radius:16px;padding:18px;margin-top:18px}' +
      '.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}' +
      '.gallery img{width:100%;height:230px;object-fit:contain;object-position:center;border-radius:10px;background:#f3f4f6;padding:6px}' +
      '.price{font-size:24px;font-weight:900;margin:8px 0}.muted,.code{color:#667085}.code{font-size:13px}' +
      '.btn{display:block;text-align:center;text-decoration:none;padding:13px;border-radius:9px;font-weight:800;margin-top:10px}' +
      '.green{background:#128c4a;color:white}.plain{border:1px solid #e5e7eb;color:#111827}' +
      '@media(max-width:500px){main{margin:14px auto}.gallery img{height:190px}}</style>' +
      '</head><body><main><div class="brand">GFS CATALOG STUDIO</div>' +
      '<section class="box"><div class="muted">' + esc(business.name) + '</div>' +
      '<h1>' + esc(product.name) + '</h1><div class="price">' + esc(price) + '</div>' +
      '<div class="code">Product code: ' + esc(code) + '</div>' +
      (stockLabel ? '<p><strong>Availability:</strong> ' + esc(stockLabel) + '</p>' : '') +
      '<p>' + esc(product.description || "Contact the business for more details.") + '</p>' +
      (business.business_location ? '<p><strong>Business location:</strong> ' + esc(business.business_location) + '</p>' : '') +
      (business.delivery_locations ? '<p><strong>Delivery locations:</strong> ' + esc(business.delivery_locations) + '</p>' : '') +
      (business.delivery_time ? '<p><strong>Delivery timeframe:</strong> ' + esc(business.delivery_time) + '</p>' : '') +
      (business.delivery_info ? '<p><strong>Delivery:</strong> ' + esc(business.delivery_info) + '</p>' : '') +
      (business.payment_terms ? '<p><strong>Payment:</strong> ' + esc(business.payment_terms) + '</p>' : '') +
      '<div class="gallery">' + gallery + '</div>' +
      (orderLink ? '<a class="btn green" href="' + esc(orderLink) + '">ORDER ON WHATSAPP</a>' : "") +
      '<a class="btn plain" href="' + esc(storeLink) + '">VIEW FULL CATALOGUE</a>' +
      '</section></main></body></html>';

    return new Response(page, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60"
      }
    });
  } catch (error) {
    return new Response("Unable to load this product preview right now.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}