// api/orderhero.js - FINAL
// Webhook: https://warungadsstudio.vercel.app/api/orderhero
// orders -> customer_name / customer_phone
// warungads_licenses -> buyer_name / buyer_phone

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'OrderHero webhook ready' });
  }

  try {
    const body = req.body || {};
    const data = body.data || body.order || body.payload || body;

    // Ambil data dari semua kemungkinan format OrderHero
    const customer_name = data.nama || data.name || data.customer_name || data.buyer_name || '';
    const customer_phone = data.whatsapp || data.phone || data.customer_phone || data.buyer_phone || data.no_hp || '';
    const customer_email = data.email || data.customer_email || data.buyer_email || '';
    const order_id = data.order_id || data.invoice || data.id || data.transaction_id || ('OH-' + Date.now());
    const amount = parseInt(data.amount || data.total || data.price || 99000, 10);

    let status = (data.status || data.payment_status || 'pending').toString().toLowerCase();
    if (['paid', 'success', 'settlement', 'completed', 'lunas', 'berhasil'].includes(status)) status = 'paid';
    else if (['pending', 'waiting', 'unpaid', 'menunggu'].includes(status)) status = 'pending';

    const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    const headers = {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    // 1. SIMPAN KE ORDERS
    await fetch(`${URL}/rest/v1/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_id: order_id,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_email: customer_email,
        product_name: 'WARUNGADS STUDIO PRO v6.0',
        amount: amount,
        status: status,
        payment_method: data.payment_method || data.metode || null,
        raw: body
      })
    });

    // 2. KALAU SUDAH PAID, BUAT LISENSI OTOMATIS
    if (status === 'paid' && customer_phone) {
      const license_key = 'WARUNGADS-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

      await fetch(`${URL}/rest/v1/warungads_licenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buyer_name: customer_name,
          buyer_phone: customer_phone,
          buyer_email: customer_email,
          license_key: license_key,
          status: 'active',
          order_id: order_id
        })
      });
    }

    return res.status(200).json({ ok: true, order_id: order_id, status: status });

  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true, note: 'received' });
  }
};
