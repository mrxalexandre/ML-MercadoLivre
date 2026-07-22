import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch Mercado Livre product details
  app.post("/api/product", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL do Mercado Livre é obrigatória." });
      }

      // 1. Fetch the URL to resolve any redirects (e.g. from short links)
      const initialResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });
      const finalUrl = initialResponse.url;

      // 2. Extract the item ID (e.g. MLB123456789)
      let match = finalUrl.match(/(MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?(\d+)/i);
      
      let htmlText = "";

      if (!match) {
        // Fallback: fetch HTML and search for ID
        htmlText = await initialResponse.text();
        match = htmlText.match(/\"(?:id|itemId|item_id)\"\s*:\s*\"((MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?\d+)\"/i);
        
        if (!match) {
           match = htmlText.match(/(MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?(\d+)/i);
        }
      }

      if (!match) {
        return res.status(400).json({ error: "Não foi possível identificar o ID do produto na URL fornecida." });
      }

      // If the match was from the fallback JSON, it will be in match[1], otherwise match[1] is prefix and match[2] is number
      let itemId = "";
      if (match[2] && match[1].length === 3) {
        itemId = `${match[1].toUpperCase()}${match[2]}`;
      } else {
        itemId = match[1].replace('-', '').toUpperCase();
      }

      // 3. Fetch product details from the official public Meli API
      const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
      if (!itemRes.ok) {
        // Fallback: If API fails (e.g. 403 due to missing token), try to extract basic info from the HTML we might have fetched.
        if (!htmlText) {
           const fallbackRes = await fetch(finalUrl, {
             headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
           });
           htmlText = await fallbackRes.text();
        }
        
        const titleMatch = htmlText.match(/<meta property=\"og:title\" content=\"([^\"]+)\"/i) || htmlText.match(/<title>([^<]+)<\/title>/i);
        const imageMatch = htmlText.match(/<meta property=\"og:image\" content=\"([^\"]+)\"/i);
        
        if (titleMatch) {
           // Return mocked minimal data so the viewer can still display something
           return res.json({
             id: itemId,
             title: titleMatch[1].replace(/\|.*$/, '').trim(),
             price: 0,
             currency_id: 'BRL',
             available_quantity: 1,
             condition: 'new',
             permalink: finalUrl,
             pictures: imageMatch ? [{ id: '1', url: imageMatch[1], secure_url: imageMatch[1] }] : [],
             video_id: null,
             attributes: [],
             warranty: '',
             plain_description: 'Informações adicionais não puderam ser carregadas devido a bloqueios de segurança do Mercado Livre.',
             thumbnail: imageMatch ? imageMatch[1] : '',
             secure_thumbnail: imageMatch ? imageMatch[1] : ''
           });
        }

        return res.status(404).json({ error: "Produto não encontrado ou indisponível na API." });
      }
      const itemData = await itemRes.json();

      // 4. Fetch the plain text description (separate endpoint)
      const descRes = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`);
      let description = "";
      if (descRes.ok) {
        const descData = await descRes.json();
        description = descData.plain_text || "";
      }

      // Return combined data
      res.json({
        ...itemData,
        plain_description: description
      });

    } catch (error: any) {
      console.error("Error scraping MELI:", error);
      res.status(500).json({ error: "Erro interno ao processar a URL do produto." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
