import express from "express";
import serverless from "serverless-http";

const app = express();
const router = express.Router();

app.use(express.json());

// A rota no Netlify ficará em /.netlify/functions/api/product
// O redirect redireciona /api/product para /.netlify/functions/api/product
router.post("/product", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL do Mercado Livre é obrigatória." });
    }

    const initialResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    
    const finalUrl = initialResponse.url;

    let match = finalUrl.match(/(MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?(\d+)/i);
      
    let htmlText = "";
    if (!match) {
      htmlText = await initialResponse.text();
      match = htmlText.match(/\"(?:id|itemId|item_id)\"\s*:\s*\"((MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?\d+)\"/i);
      
      if (!match) {
         match = htmlText.match(/(MLB|MLA|MLM|MLC|MCO|MLU|MLV|MPE|MEC)-?(\d+)/i);
      }
    }

    if (!match) {
      return res.status(400).json({ error: "Não foi possível identificar o ID do produto na URL fornecida." });
    }

    let itemId = "";
    if (match[2] && match[1].length === 3) {
      itemId = `${match[1].toUpperCase()}${match[2]}`;
    } else {
      itemId = match[1].replace('-', '').toUpperCase();
    }

    const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
    
    if (!itemRes.ok) {
      if (!htmlText) {
         const fallbackRes = await fetch(finalUrl, {
           headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
         });
         htmlText = await fallbackRes.text();
      }
      
      const titleMatch = htmlText.match(/<meta property=\"og:title\" content=\"([^\"]+)\"/i) || htmlText.match(/<title>([^<]+)<\/title>/i);
      const imageMatch = htmlText.match(/<meta property=\"og:image\" content=\"([^\"]+)\"/i);
      
      if (titleMatch) {
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
    
    const descRes = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`);
    let description = "";
    if (descRes.ok) {
      const descData = await descRes.json();
      description = descData.plain_text || "";
    }

    res.json({
      ...itemData,
      plain_description: description
    });
  } catch (error: any) {
    console.error("Error scraping MELI:", error);
    res.status(500).json({ error: "Erro interno ao processar a URL do produto." });
  }
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export const handler = serverless(app);
