// src/lib/terbilang.js
// Convert angka → huruf (bahasa Indonesia)

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function toWords(n) {
  n = Math.floor(Math.abs(n));
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${toWords(n - 10)} belas`;
  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const sisa = n % 10;
    return `${SATUAN[puluhan]} puluh${sisa ? ' ' + toWords(sisa) : ''}`;
  }
  if (n < 200) return `seratus${n - 100 ? ' ' + toWords(n - 100) : ''}`;
  if (n < 1000) {
    const ratusan = Math.floor(n / 100);
    const sisa = n % 100;
    return `${SATUAN[ratusan]} ratus${sisa ? ' ' + toWords(sisa) : ''}`;
  }
  if (n < 2000) return `seribu${n - 1000 ? ' ' + toWords(n - 1000) : ''}`;
  if (n < 1000000) {
    const ribuan = Math.floor(n / 1000);
    const sisa = n % 1000;
    return `${toWords(ribuan)} ribu${sisa ? ' ' + toWords(sisa) : ''}`;
  }
  if (n < 1000000000) {
    const jutaan = Math.floor(n / 1000000);
    const sisa = n % 1000000;
    return `${toWords(jutaan)} juta${sisa ? ' ' + toWords(sisa) : ''}`;
  }
  if (n < 1000000000000) {
    const miliar = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return `${toWords(miliar)} miliar${sisa ? ' ' + toWords(sisa) : ''}`;
  }
  const triliun = Math.floor(n / 1000000000000);
  const sisa = n % 1000000000000;
  return `${toWords(triliun)} triliun${sisa ? ' ' + toWords(sisa) : ''}`;
}

/**
 * Convert angka ke terbilang + "rupiah"
 * @param {number} n - angka
 * @returns {string} - "Satu juta lima ratus ribu rupiah"
 */
export function terbilangRupiah(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return 'Nol rupiah';
  const words = toWords(num).trim();
  return words.charAt(0).toUpperCase() + words.slice(1) + ' rupiah';
}