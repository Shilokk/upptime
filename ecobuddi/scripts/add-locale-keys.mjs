// Adds late-added UI keys to every locale (re-runnable; only fills keys that are missing).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')
const ADD = {
  en: { tabs: { leaderboard: 'Leaderboard' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Leaderboard', subtitle: 'Ranked by the number of different species photographed', species: '{{count}} species', uploads: '{{count}} uploads', you: 'You', yourRank: 'Your rank: #{{rank}}', empty: 'No observations yet. Photograph a plant to get on the board.', rank: 'Rank' } },
  es: { tabs: { leaderboard: 'Clasificación' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Clasificación', subtitle: 'Ordenado por el número de especies distintas fotografiadas', species: '{{count}} especies', uploads: '{{count}} fotos', you: 'Tú', yourRank: 'Tu puesto: n.º {{rank}}', empty: 'Aún no hay observaciones. Fotografía una planta para entrar en la tabla.', rank: 'Puesto' } },
  pt: { tabs: { leaderboard: 'Ranking' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Ranking', subtitle: 'Ordenado pelo número de espécies diferentes fotografadas', species: '{{count}} espécies', uploads: '{{count}} envios', you: 'Você', yourRank: 'Sua posição: nº {{rank}}', empty: 'Ainda não há observações. Fotografe uma planta para entrar no ranking.', rank: 'Posição' } },
  fr: { tabs: { leaderboard: 'Classement' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Classement', subtitle: "Classé selon le nombre d'espèces différentes photographiées", species: '{{count}} espèces', uploads: '{{count}} photos', you: 'Vous', yourRank: 'Votre rang : n° {{rank}}', empty: "Aucune observation pour l'instant. Photographiez une plante pour entrer au classement.", rank: 'Rang' } },
  hi: { tabs: { leaderboard: 'लीडरबोर्ड' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'लीडरबोर्ड', subtitle: 'फ़ोटो ली गई अलग-अलग प्रजातियों की संख्या के अनुसार क्रम', species: '{{count}} प्रजातियाँ', uploads: '{{count}} अपलोड', you: 'आप', yourRank: 'आपका स्थान: #{{rank}}', empty: 'अभी कोई अवलोकन नहीं है। बोर्ड पर आने के लिए किसी पौधे की फ़ोटो लें।', rank: 'स्थान' } },
  ar: { tabs: { leaderboard: 'لوحة المتصدرين' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'لوحة المتصدرين', subtitle: 'مرتّبة حسب عدد الأنواع المختلفة التي تم تصويرها', species: '{{count}} نوعًا', uploads: '{{count}} صورة', you: 'أنت', yourRank: 'ترتيبك: #{{rank}}', empty: 'لا توجد مشاهدات بعد. صوّر نبتة للدخول إلى اللوحة.', rank: 'الترتيب' } },
  th: { tabs: { leaderboard: 'กระดานผู้นำ' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'กระดานผู้นำ', subtitle: 'จัดอันดับตามจำนวนชนิดพันธุ์ที่แตกต่างกันที่ถ่ายภาพไว้', species: '{{count}} ชนิด', uploads: '{{count}} ภาพ', you: 'คุณ', yourRank: 'อันดับของคุณ: #{{rank}}', empty: 'ยังไม่มีการบันทึก ถ่ายภาพพืชเพื่อขึ้นกระดาน', rank: 'อันดับ' } },
  yo: { tabs: { leaderboard: 'Àtẹ Aṣáájú' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Àtẹ Àwọn Aṣáájú', subtitle: 'A tò ó ní ìbámu pẹ̀lú iye onírúurú irú ọ̀gbìn tí a ya fọ́tò wọn', species: 'irú ọ̀gbìn {{count}}', uploads: 'fọ́tò {{count}}', you: 'Ìwọ', yourRank: 'Ipò rẹ: #{{rank}}', empty: 'Kò tíì sí àkọsílẹ̀ kankan. Ya fọ́tò ọ̀gbìn kan láti wọ àtẹ náà.', rank: 'Ipò' } },
  ml: { tabs: { leaderboard: 'ലീഡർബോർഡ്' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'ലീഡർബോർഡ്', subtitle: 'ഫോട്ടോ എടുത്ത വ്യത്യസ്ത സ്പീഷീസുകളുടെ എണ്ണം അനുസരിച്ച് ക്രമീകരിച്ചത്', species: '{{count}} സ്പീഷീസ്', uploads: '{{count}} അപ്‌ലോഡുകൾ', you: 'നിങ്ങൾ', yourRank: 'നിങ്ങളുടെ റാങ്ക്: #{{rank}}', empty: 'ഇതുവരെ നിരീക്ഷണങ്ങളില്ല. ബോർഡിൽ കയറാൻ ഒരു ചെടിയുടെ ഫോട്ടോ എടുക്കുക.', rank: 'റാങ്ക്' } },
}
const merge = (target, add) => {
  for (const [k, v] of Object.entries(add)) {
    if (v && typeof v === 'object') merge((target[k] ??= {}), v)
    else if (!(k in target)) target[k] = v
  }
}
for (const [lang, add] of Object.entries(ADD)) {
  const file = resolve(dir, `${lang}.json`)
  let data = {}
  try { data = JSON.parse(readFileSync(file, 'utf8')) } catch { /* new file */ }
  if (Object.keys(data).length === 0 && lang !== 'en') continue // stub: the translator will write it, patch again afterwards
  merge(data, add)
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  console.log(`[${lang}] patched`)
}
