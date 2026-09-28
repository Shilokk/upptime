import i18n from '@/i18n'
import type { Candidate, ChatMessage, Lang } from './types'
import { splitDataUrl } from './image'
import { findSpeciesByName, speciesText } from './species'
import { useServerStatus } from './identify'

export interface ChatInput {
  photo: string
  candidate: Candidate
  language: Lang
  history: ChatMessage[]
  question: string
}

export async function askAboutPlant(input: ChatInput): Promise<{ reply: string; source: 'claude' | 'mock' }> {
  const status = useServerStatus.getState()
  if (status.live !== false || Date.now() - status.checkedAt > 60_000) {
    try {
      const { mediaType, data } = splitDataUrl(input.photo)
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 40_000)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          image: data,
          mediaType,
          candidate: { scientificName: input.candidate.scientificName, commonName: input.candidate.commonName, confidence: input.candidate.confidence },
          language: input.language,
          messages: [...input.history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: input.question }],
        }),
      })
      clearTimeout(t)
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as { reply?: string }
      if (!json.reply) throw new Error('empty reply')
      useServerStatus.getState().setLive(true)
      return { reply: json.reply, source: 'claude' }
    } catch (err) {
      console.warn('[chat] falling back to demo answers:', err)
    }
  }
  return { reply: mockAnswer(input), source: 'mock' }
}

const KW = {
  pets: /pet|dog|cat\b|kids|child|mascota|perro|gato|niñ|chien|chat\b|enfant|cão|cachorro|gato|criança|कुत्त|बिल्ल|पालतू|बच्च|كلب|قط|أطفال|حيوان|สัตว์เลี้ยง|หมา|แมว|เด็ก|ajá|ológbò|ọmọ|ẹran|വളർത്തുമൃഗ|നായ|പൂച്ച|കുട്ടി/i,
  safety: /safe|toxic|poison|danger|seguro|tóxic|venen|peligro|sûr|toxique|sécur|dangere|perigo|ज़हर|जहर|सुरक्षित|ख़तर|سام|آمن|خطر|سم|ปลอดภัย|พิษ|อันตราย|májèlé|ewu|ààbò|വിഷ|സുരക്ഷ|അപകട/i,
  edible: /edible|eat|forage|cook|tea|comer|comestib|manger|mange|cozinh|खा|खाद्य|चाय|أكل|صالح|طعام|กิน|jẹ|ഭക്ഷ|കഴിക്ക/i,
  flower: /flower|bloom|blossom|when|season|floreC|florez|flor\b|fleur|quand|saison|quando|estação|फूल|कब|मौसम|زهر|يزهر|متى|موسم|ดอก|เมื่อไร|òdòdó|ìgbà|പൂ|എപ്പോ/i,
  lookalike: /look-?alike|similar|confus|mistake|differ|tell.*from|parecid|confund|distingu|ressembl|semelhan|समान|मिलत|अंतर|فرق|يشبه|شبيه|คล้าย|แยก|jọ|ìyàtọ̀|സാമ്യ|വേർതിരി/i,
  invasive: /invasiv|invasor|envahiss|invasora|आक्रामक|غاز|รุกราน|gbógun|അധിനിവേശ/i,
  medicinal: /medic|remed|herbal|heal|medicin|remède|remédio|औषध|दवा|دواء|علاج|طبي|ยา|สมุนไพร|oògùn|ഔഷധ|മരുന്ന്/i,
}

// Offline answer templates. Languages without an entry fall back to English.
const T: Partial<Record<Lang, Record<string, string>>> = {
  en: {
    intro: 'Based on the chosen match, {{name}} ({{sci}}):',
    toxic: 'This plant is recorded as toxic, so keep pets and children from chewing it and wash hands after touching it.',
    notToxic: 'It is not listed as toxic in the EcoBuddi library, but any plant can upset a stomach if eaten, so keep pets from grazing on it.',
    noNotes: 'The species library has no notes on that yet. Try asking about its ecology, flowering, or look-alikes.',
    uncertain: 'Note that this identification is not High confidence, so treat any use notes with caution.',
    lookalike: 'To tell it from look-alikes, compare these features: {{desc}} Photograph a single leaf and a flower or fruit for a more certain ID.',
    invasiveYes: 'It is listed as invasive in your region. Avoid spreading fragments or seeds, and consider reporting the sighting to your local program.',
    invasiveNo: 'It is not listed as invasive in your region, though it is elsewhere: {{where}}.',
    invasiveNone: 'It is not recorded as invasive anywhere in the EcoBuddi library.',
    unknownSpecies: 'That species is not in the offline library, so I can only describe what the identification returned: {{reason}}',
  },
  es: {
    intro: 'Según la coincidencia elegida, {{name}} ({{sci}}):',
    toxic: 'Esta planta consta como tóxica; evita que mascotas y niños la mastiquen y lávate las manos tras tocarla.',
    notToxic: 'No figura como tóxica en la biblioteca de EcoBuddi, pero cualquier planta puede sentar mal si se come, así que evita que las mascotas la pasten.',
    noNotes: 'La biblioteca de especies aún no tiene notas sobre eso. Prueba a preguntar por su ecología, su floración o sus parecidos.',
    uncertain: 'Ten en cuenta que esta identificación no tiene confianza Alta, así que toma las notas de uso con cautela.',
    lookalike: 'Para distinguirla de especies parecidas, compara estos rasgos: {{desc}} Fotografía una sola hoja y una flor o fruto para una identificación más segura.',
    invasiveYes: 'Está catalogada como invasora en tu región. Evita dispersar fragmentos o semillas y considera informar del avistamiento a tu programa local.',
    invasiveNo: 'No está catalogada como invasora en tu región, aunque sí en otros lugares: {{where}}.',
    invasiveNone: 'No consta como invasora en ningún lugar de la biblioteca de EcoBuddi.',
    unknownSpecies: 'Esa especie no está en la biblioteca sin conexión, así que solo puedo describir lo que devolvió la identificación: {{reason}}',
  },
  hi: {
    intro: 'चुने गए मिलान के आधार पर, {{name}} ({{sci}}):',
    toxic: 'यह पौधा ज़हरीला दर्ज है, इसलिए पालतू जानवरों और बच्चों को इसे चबाने से रोकें और छूने के बाद हाथ धोएँ।',
    notToxic: 'EcoBuddi लाइब्रेरी में यह ज़हरीला दर्ज नहीं है, लेकिन कोई भी पौधा खाने पर पेट खराब कर सकता है, इसलिए पालतू जानवरों को इसे चरने न दें।',
    noNotes: 'प्रजाति लाइब्रेरी में इस बारे में अभी नोट नहीं हैं। इसकी पारिस्थितिकी, फूल आने या मिलती-जुलती प्रजातियों के बारे में पूछकर देखें।',
    uncertain: 'ध्यान दें कि यह पहचान उच्च विश्वास की नहीं है, इसलिए उपयोग संबंधी नोट्स को सावधानी से लें।',
    lookalike: 'मिलती-जुलती प्रजातियों से अलग पहचानने के लिए इन विशेषताओं की तुलना करें: {{desc}} अधिक निश्चित पहचान के लिए एक पत्ती और एक फूल या फल की तस्वीर लें।',
    invasiveYes: 'यह आपके क्षेत्र में आक्रामक प्रजाति के रूप में सूचीबद्ध है। इसके टुकड़े या बीज फैलाने से बचें और स्थानीय कार्यक्रम को सूचित करने पर विचार करें।',
    invasiveNo: 'यह आपके क्षेत्र में आक्रामक सूचीबद्ध नहीं है, हालाँकि अन्य जगहों पर है: {{where}}।',
    invasiveNone: 'EcoBuddi लाइब्रेरी में यह कहीं भी आक्रामक दर्ज नहीं है।',
    unknownSpecies: 'यह प्रजाति ऑफ़लाइन लाइब्रेरी में नहीं है, इसलिए मैं केवल वही बता सकता हूँ जो पहचान में मिला: {{reason}}',
  },
  ar: {
    intro: 'استنادًا إلى المطابقة المختارة، {{name}} ({{sci}}):',
    toxic: 'هذا النبات مسجّل كنبات سام، لذا أبعد الحيوانات الأليفة والأطفال عن مضغه واغسل يديك بعد لمسه.',
    notToxic: 'ليس مدرجًا كنبات سام في مكتبة EcoBuddi، لكن أي نبات قد يسبب اضطرابًا في المعدة إذا أُكل، لذا امنع الحيوانات الأليفة من رعيه.',
    noNotes: 'لا تحتوي مكتبة الأنواع على ملاحظات حول ذلك بعد. جرّب السؤال عن بيئته أو موسم إزهاره أو الأنواع المشابهة له.',
    uncertain: 'لاحظ أن هذا التعريف ليس بثقة عالية، لذا تعامل مع ملاحظات الاستخدام بحذر.',
    lookalike: 'لتمييزه عن الأنواع المشابهة، قارن هذه الصفات: {{desc}} صوّر ورقة واحدة وزهرة أو ثمرة للحصول على تعريف أكثر يقينًا.',
    invasiveYes: 'هو مدرج كنوع غازٍ في منطقتك. تجنب نشر أجزائه أو بذوره، وفكّر في الإبلاغ عن المشاهدة لبرنامجك المحلي.',
    invasiveNo: 'ليس مدرجًا كنوع غازٍ في منطقتك، لكنه كذلك في أماكن أخرى: {{where}}.',
    invasiveNone: 'ليس مسجلًا كنوع غازٍ في أي مكان في مكتبة EcoBuddi.',
    unknownSpecies: 'هذا النوع غير موجود في المكتبة دون اتصال، لذا يمكنني فقط وصف ما أعاده التعريف: {{reason}}',
  },
  fr: {
    intro: 'D’après la correspondance choisie, {{name}} ({{sci}}) :',
    toxic: 'Cette plante est signalée comme toxique : empêchez les animaux et les enfants de la mâcher et lavez-vous les mains après l’avoir touchée.',
    notToxic: 'Elle n’est pas signalée comme toxique dans la bibliothèque EcoBuddi, mais toute plante peut perturber la digestion si elle est mangée ; évitez donc que les animaux la broutent.',
    noNotes: 'La bibliothèque des espèces n’a pas encore de notes à ce sujet. Essayez de demander son écologie, sa floraison ou ses sosies.',
    uncertain: 'Notez que cette identification n’est pas de confiance Élevée : prenez les notes d’usage avec prudence.',
    lookalike: 'Pour la distinguer de ses sosies, comparez ces caractères : {{desc}} Photographiez une seule feuille et une fleur ou un fruit pour une identification plus sûre.',
    invasiveYes: 'Elle est classée envahissante dans votre région. Évitez de disperser fragments ou graines et pensez à signaler l’observation à votre programme local.',
    invasiveNo: 'Elle n’est pas classée envahissante dans votre région, mais l’est ailleurs : {{where}}.',
    invasiveNone: 'Elle n’est signalée envahissante nulle part dans la bibliothèque EcoBuddi.',
    unknownSpecies: 'Cette espèce n’est pas dans la bibliothèque hors ligne ; je ne peux décrire que ce que l’identification a renvoyé : {{reason}}',
  },
  pt: {
    intro: 'Com base na correspondência escolhida, {{name}} ({{sci}}):',
    toxic: 'Esta planta consta como tóxica; mantenha animais e crianças longe dela e lave as mãos depois de tocá-la.',
    notToxic: 'Não consta como tóxica na biblioteca do EcoBuddi, mas qualquer planta pode causar mal-estar se ingerida, então não deixe animais pastarem nela.',
    noNotes: 'A biblioteca de espécies ainda não tem notas sobre isso. Experimente perguntar sobre a ecologia, a floração ou as espécies parecidas.',
    uncertain: 'Note que esta identificação não tem confiança Alta, então trate as notas de uso com cautela.',
    lookalike: 'Para distingui-la de espécies parecidas, compare estas características: {{desc}} Fotografe uma única folha e uma flor ou fruto para uma identificação mais segura.',
    invasiveYes: 'Ela está listada como invasora na sua região. Evite espalhar fragmentos ou sementes e considere relatar o registro ao programa local.',
    invasiveNo: 'Não está listada como invasora na sua região, embora esteja em outros lugares: {{where}}.',
    invasiveNone: 'Não consta como invasora em nenhum lugar na biblioteca do EcoBuddi.',
    unknownSpecies: 'Essa espécie não está na biblioteca offline, então só posso descrever o que a identificação retornou: {{reason}}',
  },
  th: {
    intro: 'จากผลการจับคู่ที่เลือก {{name}} ({{sci}}):',
    toxic: 'พืชชนิดนี้มีบันทึกว่ามีพิษ ควรกันสัตว์เลี้ยงและเด็กไม่ให้เคี้ยว และล้างมือหลังสัมผัส',
    notToxic: 'ไม่ได้ระบุว่ามีพิษในคลังข้อมูลของ EcoBuddi แต่พืชทุกชนิดอาจทำให้ท้องเสียได้หากกินเข้าไป จึงควรกันสัตว์เลี้ยงไม่ให้กิน',
    noNotes: 'คลังข้อมูลชนิดพันธุ์ยังไม่มีบันทึกเรื่องนี้ ลองถามเกี่ยวกับนิเวศวิทยา ช่วงออกดอก หรือชนิดที่คล้ายกัน',
    uncertain: 'โปรดทราบว่าการระบุนี้ไม่ได้อยู่ในระดับความมั่นใจสูง จึงควรใช้ข้อมูลการใช้ประโยชน์อย่างระมัดระวัง',
    lookalike: 'เพื่อแยกจากชนิดที่คล้ายกัน ให้เปรียบเทียบลักษณะเหล่านี้: {{desc}} ถ่ายภาพใบเดี่ยวและดอกหรือผลเพื่อการระบุที่แม่นยำขึ้น',
    invasiveYes: 'พืชชนิดนี้ถูกจัดเป็นชนิดพันธุ์รุกรานในภูมิภาคของคุณ หลีกเลี่ยงการแพร่กระจายชิ้นส่วนหรือเมล็ด และพิจารณารายงานการพบเห็นต่อโครงการในท้องถิ่น',
    invasiveNo: 'ไม่ได้จัดเป็นชนิดพันธุ์รุกรานในภูมิภาคของคุณ แต่เป็นในที่อื่น: {{where}}',
    invasiveNone: 'ไม่มีบันทึกว่าเป็นชนิดพันธุ์รุกรานที่ใดในคลังข้อมูลของ EcoBuddi',
    unknownSpecies: 'ชนิดพันธุ์นี้ไม่อยู่ในคลังข้อมูลออฟไลน์ จึงบอกได้เพียงสิ่งที่การระบุส่งกลับมา: {{reason}}',
  },
  yo: {
    intro: 'Gẹ́gẹ́ bí ìbámu tí a yàn, {{name}} ({{sci}}):',
    toxic: 'A kọ ọ̀gbìn yìí sílẹ̀ pé ó ní májèlé, nítorí náà má jẹ́ kí ẹran ọ̀sìn àti àwọn ọmọdé jẹ ẹ́, kí o sì fọ ọwọ́ lẹ́yìn tí o bá fọwọ́ kàn án.',
    notToxic: 'Kò sí nínú àkọsílẹ̀ EcoBuddi pé ó ní májèlé, ṣùgbọ́n ọ̀gbìn èyíkéyìí lè da inú rú tí a bá jẹ ẹ́, nítorí náà má jẹ́ kí ẹran ọ̀sìn jẹ ẹ́.',
    noNotes: 'Àkọsílẹ̀ àwọn irú ọ̀gbìn kò tíì ní àlàyé lórí ìyẹn. Gbìyànjú láti béèrè nípa àyíká rẹ̀, ìgbà tí ó ń yọ òdòdó, tàbí àwọn tí ó jọ ọ́.',
    uncertain: 'Ṣe àkíyèsí pé ìdámọ̀ yìí kò ní ìgbọ́kànlé Gíga, nítorí náà fi ìṣọ́ra lo àwọn àlàyé nípa ìlò rẹ̀.',
    lookalike: 'Láti mọ ìyàtọ̀ rẹ̀ láàrín àwọn tí ó jọ ọ́, fi àwọn àmì wọ̀nyí wéra: {{desc}} Ya fọ́tò ewé kan ṣoṣo àti òdòdó tàbí èso fún ìdámọ̀ tí ó dájú jù.',
    invasiveYes: 'A kọ ọ́ sílẹ̀ gẹ́gẹ́ bí ọ̀gbìn tí ń gbógun ti àyíká ní agbègbè rẹ. Yẹra fún títan àwọn ẹ̀ka tàbí irúgbìn rẹ̀ ká, kí o sì ronú láti jábọ̀ rẹ̀ fún ètò agbègbè rẹ.',
    invasiveNo: 'A kò kọ ọ́ sílẹ̀ gẹ́gẹ́ bí ọ̀gbìn tí ń gbógun ti àyíká ní agbègbè rẹ, ṣùgbọ́n ó rí bẹ́ẹ̀ níbòmíràn: {{where}}.',
    invasiveNone: 'Kò sí ibì kankan nínú àkọsílẹ̀ EcoBuddi tí a kọ ọ́ sí gẹ́gẹ́ bí ọ̀gbìn tí ń gbógun ti àyíká.',
    unknownSpecies: 'Irú ọ̀gbìn yìí kò sí nínú àkọsílẹ̀ tí kò nílò ìntánẹ́ẹ̀tì, nítorí náà ohun tí ìdámọ̀ náà dá padà nìkan ni mo lè ṣàlàyé: {{reason}}',
  },
  ml: {
    intro: 'തിരഞ്ഞെടുത്ത പൊരുത്തം അനുസരിച്ച്, {{name}} ({{sci}}):',
    toxic: 'ഈ ചെടി വിഷമുള്ളതായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്; വളർത്തുമൃഗങ്ങളും കുട്ടികളും ഇത് ചവയ്ക്കാതെ നോക്കുക, തൊട്ടശേഷം കൈ കഴുകുക.',
    notToxic: 'EcoBuddi ലൈബ്രറിയിൽ ഇത് വിഷമുള്ളതായി രേഖപ്പെടുത്തിയിട്ടില്ല, എന്നാൽ ഏതു ചെടിയും കഴിച്ചാൽ വയറിന് അസ്വസ്ഥത ഉണ്ടാക്കാം; അതിനാൽ വളർത്തുമൃഗങ്ങൾ ഇത് തിന്നാതെ നോക്കുക.',
    noNotes: 'സ്പീഷീസ് ലൈബ്രറിയിൽ അതിനെക്കുറിച്ച് ഇതുവരെ കുറിപ്പുകളില്ല. ഇതിന്റെ പരിസ്ഥിതി, പൂവിടൽ, അല്ലെങ്കിൽ സാമ്യമുള്ള ചെടികളെക്കുറിച്ച് ചോദിച്ചുനോക്കൂ.',
    uncertain: 'ഈ തിരിച്ചറിയൽ ഉയർന്ന വിശ്വാസ്യതയിലല്ല എന്നത് ശ്രദ്ധിക്കുക; അതിനാൽ ഉപയോഗ കുറിപ്പുകൾ ജാഗ്രതയോടെ കാണുക.',
    lookalike: 'സാമ്യമുള്ളവയിൽ നിന്ന് വേർതിരിക്കാൻ ഈ സവിശേഷതകൾ താരതമ്യം ചെയ്യുക: {{desc}} കൂടുതൽ ഉറപ്പുള്ള തിരിച്ചറിയലിന് ഒരു ഇലയും ഒരു പൂവോ കായോ ഫോട്ടോ എടുക്കുക.',
    invasiveYes: 'ഇത് നിങ്ങളുടെ പ്രദേശത്ത് അധിനിവേശ സസ്യമായി പട്ടികപ്പെടുത്തിയിട്ടുണ്ട്. ഇതിന്റെ ഭാഗങ്ങളോ വിത്തുകളോ പരത്താതിരിക്കുക, കണ്ടെത്തൽ പ്രാദേശിക പരിപാടിക്ക് റിപ്പോർട്ട് ചെയ്യുന്നത് പരിഗണിക്കുക.',
    invasiveNo: 'ഇത് നിങ്ങളുടെ പ്രദേശത്ത് അധിനിവേശ സസ്യമായി പട്ടികപ്പെടുത്തിയിട്ടില്ല, എന്നാൽ മറ്റിടങ്ങളിൽ അങ്ങനെയാണ്: {{where}}.',
    invasiveNone: 'EcoBuddi ലൈബ്രറിയിൽ ഇത് എവിടെയും അധിനിവേശ സസ്യമായി രേഖപ്പെടുത്തിയിട്ടില്ല.',
    unknownSpecies: 'ഈ സ്പീഷീസ് ഓഫ്‌ലൈൻ ലൈബ്രറിയിൽ ഇല്ല, അതിനാൽ തിരിച്ചറിയൽ നൽകിയത് മാത്രമേ എനിക്ക് വിവരിക്കാനാകൂ: {{reason}}',
  },
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

/** Offline answers built from the species library. Used when the server or the model is unavailable. */
export function mockAnswer(input: ChatInput): string {
  const lang = input.language
  const t = (T[lang] ?? T.en) as Record<string, string>
  const sp = findSpeciesByName(input.candidate.scientificName)
  const disclaimer = i18n.t('uses.disclaimer', { lng: lang })
  if (!sp) return fill(t.unknownSpecies, { reason: input.candidate.reasoning })
  const text = speciesText(sp, lang)
  const q = input.question
  const parts: string[] = [fill(t.intro, { name: text.commonName, sci: sp.scientificName })]
  const high = input.candidate.confidence >= 85
  if (KW.pets.test(q) || KW.safety.test(q)) {
    parts.push(sp.toxic ? t.toxic : t.notToxic)
    if (text.edible && /not edible|no es comestible|non comestible|não é comestível|खाने योग्य नहीं|غير صالح/i.test(text.edible)) parts.push(text.edible)
  } else if (KW.edible.test(q)) {
    parts.push(high ? (text.edible ?? t.noNotes) : t.uncertain)
    parts.push(disclaimer)
  } else if (KW.medicinal.test(q)) {
    parts.push(high ? (text.medicinal ?? t.noNotes) : t.uncertain)
    parts.push(disclaimer)
  } else if (KW.lookalike.test(q)) {
    parts.push(fill(t.lookalike, { desc: text.description }))
  } else if (KW.invasive.test(q)) {
    if (sp.invasiveIn.length === 0) parts.push(t.invasiveNone)
    else parts.push(fill(t.invasiveNo, { where: sp.invasiveIn.join(', ') }))
  } else if (KW.flower.test(q)) {
    parts.push(text.description)
    parts.push(text.ecologicalRole)
  } else {
    parts.push(text.description)
    if (text.culturalUses) parts.push(text.culturalUses)
  }
  if (!high && !KW.edible.test(q) && !KW.medicinal.test(q)) parts.push(t.uncertain)
  return parts.join(' ')
}
