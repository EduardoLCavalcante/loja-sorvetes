import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { amount, card, customer } = req.body;

  try {
    const response = await fetch("https://api.infinitypay.com/v1/payment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.INFINITYPAY_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        payment_method: "credit_card",
        card,
        customer
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err });
  }
}
