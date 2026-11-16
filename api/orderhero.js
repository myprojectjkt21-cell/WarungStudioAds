module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body || {};
    const data = body.data || body.order || body.payload || body;

    const customer_name = data.nama || data.name || data.customer_name || '';
    const customer_phone = data.whatsapp || data.phone || data.customer_phone || data.no_hp || '';
    const customer_email = data.email || data.customer_email || '';
    const order_id = data.order_id || data.invoice || data.id || ('OH-' + Date.now());
    const amount = parseInt(data.amount || data.total || 99000, 10);
    let status = (data.status || data.payment_status || 'pending').toString().toLowerCase();
    if (['paid','success','settlement','completed','lunas'].includes(status)) status = 'paid';

    const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const headers = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' };

    await fetch(`${URL}/rest/v1/orders`, {
      method: 'POST', headers,
      body: JSON.stringify({ 
  buyer_name: customer_name, 
  buyer_phone: customer_phone, 
  buyer_email: customer_email, 
  license_key, 
  status: 'active', 
  order_id 
})
    if (status === 'paid' && customer_phone) {
      const license_key = 'WARUNGADS-' + Math.random().toString(36).slice(2,8).toUpperCase();
      await fetch(`${URL}/rest/v1/warungads_licenses`, {
        method: 'POST', headers,
        body: JSON.stringify({ whatsapp: customer_phone, email: customer_email, name: customer_name, license_key, status: 'active', order_id })
      });
    }

    return res.status(200).json({ ok: true, order_id, status });
  } catch(e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
};
