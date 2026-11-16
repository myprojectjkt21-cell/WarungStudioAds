// Webhook OrderHero -> Supabase
// URL webhook: https://warungadsstudio.vercel.app/api/orderhero

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'OrderHero webhook ready' });
  }

  try {
    const body = req.body || {};
    // OrderHero kadang kirim format beda-beda, kita tangkap semua kemungkinan
    const data = body.data || body.order || body.payload || body;

    const nama = data.nama || data.name || data.customer_name || data.buyer_name || '';
    const whatsapp = data.whatsapp || data.phone || data.no_hp || data.customer_phone || data.buyer_phone || '';
    const email = data.email || data.customer_email || data.buyer_email || '';
    const order_id = data.order_id || data.invoice || data.id || data.transaction_id || ('OH-' + Date.now());
    const amount = parseInt(data.amount || data.total || data.price || 99000, 10);
    let status = (data.status || data.payment_status || 'pending').toString().toLowerCase();

    // Normalisasi status
    if (['paid', 'success', 'settlement', 'completed', 'lunas', 'berhasil'].includes(status)) status = 'paid';
    else if (['pending', 'waiting', 'unpaid', 'menunggu'].includes(status)) status = 'pending';

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    // 1. Simpan ke orders
    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        order_id, nama, whatsapp, email,
        produk: 'WARUNGADS STUDIO PRO v6.0',
        amount, status,
        payment_method: data.payment_method || data.metode || null,
        raw: body
      })
    });

    // 2. Kalau sudah PAID, buatkan lisensi otomatis
    if (status === 'paid' && whatsapp) {
      const license_key = 'WARUNGADS-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
      await fetch(`${SUPABASE_URL}/rest/v1/warungads_licenses`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': 'Bearer ' + SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ whatsapp, email, license_key, status: 'active', order_id })
      });
    }

    return res.status(200).json({ ok: true, order_id, status });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true, note: 'received but error logged' });
  }
};
