// api/orderhero.js - FINAL + WA OTOMATIS (Pilihan A)
// Webhook: https://warungadsstudio.vercel.app/api/orderhero
// orders -> customer_name / customer_phone
// warungads_licenses -> buyer_name / buyer_phone

async function kirimWA(tujuan, pesan) {
  try {
    const token = process.env.FONNTE_TOKEN;
    if (!token || !tujuan) return;
    let no = tujuan.toString().replace(/\D/g, '');
    if (no.startsWith('0')) no = '62' + no.slice(1);
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: no, message: pesan })
    });
  } catch (e) { console.error('WA Gagal:', e.message); }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'OrderHero webhook ready' });
  }

  try {
    const body = req.body || {};
    const data = body.data || body.order || body.payload || body;

    const customer_name = data.nama || data.name || data.customer_name || data.buyer_name || '';
    const customer_phone = data.whatsapp || data.phone || data.customer_phone || data.buyer_phone || data.no_hp || '';
    const customer_email = data.email || data.customer_email || data.buyer_email || '';
    const order_id = data.order_id || data.invoice || data.id || data.transaction_id || ('OH-' + Date.now());
    const amount = parseInt(data.amount || data.total || data.price || 99000, 10);

    // Baca event dari OrderHero: order_new vs order_paid
    const eventType = (body.event || body.type || data.event || '').toString().toLowerCase();
    let status = (data.status || data.payment_status || 'pending').toString().toLowerCase();
    if (eventType.includes('paid')) status = 'paid';
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

    // 2. KALAU SUDAH PAID, BUAT LISENSI + KIRIM WA
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

      // WA KE PEMBELI (WA ke-2, WA ke-1 dari OrderHero tetap jalan)
      const pesanPembeli = `Halo ${customer_name} 👋\n\nTerima kasih sudah order *WARUNGADS STUDIO PRO v6.0* 🎉\n\n✅ Pembayaran Rp 99.000 BERHASIL\n🔑 Kode Lisensi VIP kamu:\n*${license_key}*\n\n👉 Link Akses Aplikasi:\nhttps://warungadsstudio.vercel.app/app/\n\nCara pakai:\n1. Buka link di atas\n2. Masukkan Kode Lisensi di atas\n3. Langsung buat poster + video iklan!\n\nBonus 4 ebook sudah ada di dalam aplikasi ya.\n\nButuh bantuan? Balas WA ini aja.\n- WarungAds Studio`;
      await kirimWA(customer_phone, pesanPembeli);

      // NOTIF KE ADMIN
      if (process.env.WA_ADMIN_NUMBER) {
        await kirimWA(process.env.WA_ADMIN_NUMBER, `🔥 ORDER BARU Rp 99.000!\nNama: ${customer_name}\nWA: ${customer_phone}\nOrder: ${order_id}\nLisensi: ${license_key}`);
      }
    }

    return res.status(200).json({ ok: true, order_id: order_id, status: status });

  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true, note: 'received' });
  }
};
