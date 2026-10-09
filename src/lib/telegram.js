// src/lib/telegram.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function kirimLaporan(pesan) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/kirim-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ pesan }),
    });
    const data = await res.json();
    if (!data.ok) console.error('[Telegram] Gagal:', data);
    return data;
  } catch (err) {
    console.error('[Telegram] Error:', err);
    return { ok: false, error: String(err) };
  }
}

function fmtTanggal(dateStr, timeStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const tgl = d.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  return timeStr ? `${tgl} ${timeStr}` : tgl;
}

function fmtRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// ============ BARANG MASUK ============
export function formatInbound(inbound, lines = []) {
  const items = lines.length
    ? lines.map(l => `  • ${l.name} — ${l.qty} ${l.unit || ''}`).join('\n')
    : '  (tidak ada item)';

  return [
    `📥 <b>BARANG MASUK</b>`,
    `Kode     : <code>${inbound.code || '-'}</code>`,
    `Tanggal  : ${fmtTanggal(inbound.date, inbound.time)}`,
    `Supplier : ${inbound.supplier_name || '-'}`,
    `Items    : ${inbound.items || lines.length} jenis, ${inbound.total_qty || 0} qty`,
    ``,
    `<b>Detail:</b>`,
    items,
    ``,
    `Dicatat  : ${inbound.staff_name || '-'}`,
    inbound.notes ? `Catatan  : ${inbound.notes}` : '',
  ].filter(Boolean).join('\n');
}

// ============ BARANG KELUAR ============
export function formatOutbound(outbound, lines = []) {
  const items = lines.length
    ? lines.map(l => `  • ${l.name} — ${l.qty} ${l.unit || ''}`).join('\n')
    : '  (tidak ada item)';

  return [
    `📤 <b>BARANG KELUAR</b>`,
    `Kode     : <code>${outbound.code || '-'}</code>`,
    `Tanggal  : ${fmtTanggal(outbound.date, outbound.time)}`,
    `Customer : ${outbound.customer || '-'}`,
    outbound.customer_address ? `Alamat   : ${outbound.customer_address}` : '',
    outbound.driver ? `Driver   : ${outbound.driver}` : '',
    `Items    : ${outbound.items || lines.length} jenis, ${outbound.total_qty || 0} qty`,
    outbound.subtotal ? `Subtotal : ${fmtRp(outbound.subtotal)}` : '',
    ``,
    `<b>Detail:</b>`,
    items,
    ``,
    `Dicatat  : ${outbound.staff_name || '-'}`,
    outbound.notes ? `Catatan  : ${outbound.notes}` : '',
  ].filter(Boolean).join('\n');
}

// ============ ABSEN MASUK ============
export function formatAbsenMasuk(att) {
  const jam = att.timestamp
    ? new Date(att.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

  const flags = [];
  if (att.is_late) flags.push('⚠️ Terlambat');
  if (att.location_is_mock) flags.push('🚨 Fake GPS');
  if (att.location_within_radius === false) flags.push('📍 Di luar radius');
  if (att.is_simulated) flags.push('🧪 Simulasi');

  return [
    `🕗 <b>ABSEN MASUK</b>`,
    `Nama     : <b>${att.worker_name || '-'}</b>`,
    `Jam      : ${jam}`,
    `Tipe     : ${att.type || 'clock-in'}`,
    att.location_address ? `Lokasi   : ${att.location_address}` : '',
    att.location_distance != null ? `Jarak    : ${att.location_distance} m` : '',
    flags.length ? `` : '',
    flags.length ? `<b>Catatan:</b> ${flags.join(' | ')}` : '',
    att.notes ? `Notes    : ${att.notes}` : '',
  ].filter(Boolean).join('\n');
}

// ============ ABSEN PULANG ============
export function formatAbsenPulang(att) {
  const jam = att.timestamp
    ? new Date(att.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

  const flags = [];
  if (att.is_early_out) flags.push('⚠️ Pulang awal');
  if (att.location_is_mock) flags.push('🚨 Fake GPS');
  if (att.location_within_radius === false) flags.push('📍 Di luar radius');
  if (att.is_simulated) flags.push('🧪 Simulasi');

  return [
    `🕓 <b>ABSEN PULANG</b>`,
    `Nama     : <b>${att.worker_name || '-'}</b>`,
    `Jam      : ${jam}`,
    `Tipe     : ${att.type || 'clock-out'}`,
    att.location_address ? `Lokasi   : ${att.location_address}` : '',
    att.location_distance != null ? `Jarak    : ${att.location_distance} m` : '',
    flags.length ? `` : '',
    flags.length ? `<b>Catatan:</b> ${flags.join(' | ')}` : '',
    att.notes ? `Notes    : ${att.notes}` : '',
  ].filter(Boolean).join('\n');
}