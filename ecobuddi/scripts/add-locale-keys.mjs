// Adds late-added UI keys to every locale (re-runnable; only fills keys that are missing).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')
const ADD = {
  en: { result: { savedToast: 'Saved to survey', shutter: 'Take photo' }, tabs: { leaderboard: 'Leaderboard' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Leaderboard', subtitle: 'Ranked by the number of different species photographed', species: '{{count}} species', uploads: '{{count}} uploads', you: 'You', yourRank: 'Your rank: #{{rank}}', empty: 'No observations yet. Photograph a plant to get on the board.', rank: 'Rank' } },
  es: { result: { savedToast: 'Guardado en el estudio', shutter: 'Tomar foto' }, tabs: { leaderboard: 'Clasificación' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Clasificación', subtitle: 'Ordenado por el número de especies distintas fotografiadas', species: '{{count}} especies', uploads: '{{count}} fotos', you: 'Tú', yourRank: 'Tu puesto: n.º {{rank}}', empty: 'Aún no hay observaciones. Fotografía una planta para entrar en la tabla.', rank: 'Puesto' } },
  pt: { result: { savedToast: 'Salvo na pesquisa', shutter: 'Tirar foto' }, tabs: { leaderboard: 'Ranking' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Ranking', subtitle: 'Ordenado pelo número de espécies diferentes fotografadas', species: '{{count}} espécies', uploads: '{{count}} envios', you: 'Você', yourRank: 'Sua posição: nº {{rank}}', empty: 'Ainda não há observações. Fotografe uma planta para entrar no ranking.', rank: 'Posição' } },
  fr: { result: { savedToast: 'Enregistré dans le relevé', shutter: 'Prendre la photo' }, tabs: { leaderboard: 'Classement' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Classement', subtitle: "Classé selon le nombre d'espèces différentes photographiées", species: '{{count}} espèces', uploads: '{{count}} photos', you: 'Vous', yourRank: 'Votre rang : n° {{rank}}', empty: "Aucune observation pour l'instant. Photographiez une plante pour entrer au classement.", rank: 'Rang' } },
  hi: { result: { savedToast: 'सर्वे में सहेजा गया', shutter: 'फ़ोटो लें' }, tabs: { leaderboard: 'लीडरबोर्ड' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'लीडरबोर्ड', subtitle: 'फ़ोटो ली गई अलग-अलग प्रजातियों की संख्या के अनुसार क्रम', species: '{{count}} प्रजातियाँ', uploads: '{{count}} अपलोड', you: 'आप', yourRank: 'आपका स्थान: #{{rank}}', empty: 'अभी कोई अवलोकन नहीं है। बोर्ड पर आने के लिए किसी पौधे की फ़ोटो लें।', rank: 'स्थान' } },
  ar: { result: { savedToast: 'تم الحفظ في المسح', shutter: 'التقاط الصورة' }, tabs: { leaderboard: 'لوحة المتصدرين' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'لوحة المتصدرين', subtitle: 'مرتّبة حسب عدد الأنواع المختلفة التي تم تصويرها', species: '{{count}} نوعًا', uploads: '{{count}} صورة', you: 'أنت', yourRank: 'ترتيبك: #{{rank}}', empty: 'لا توجد مشاهدات بعد. صوّر نبتة للدخول إلى اللوحة.', rank: 'الترتيب' } },
  th: { result: { savedToast: 'บันทึกลงแบบสำรวจแล้ว', shutter: 'ถ่ายภาพ' }, tabs: { leaderboard: 'กระดานผู้นำ' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'กระดานผู้นำ', subtitle: 'จัดอันดับตามจำนวนชนิดพันธุ์ที่แตกต่างกันที่ถ่ายภาพไว้', species: '{{count}} ชนิด', uploads: '{{count}} ภาพ', you: 'คุณ', yourRank: 'อันดับของคุณ: #{{rank}}', empty: 'ยังไม่มีการบันทึก ถ่ายภาพพืชเพื่อขึ้นกระดาน', rank: 'อันดับ' } },
  yo: { result: { savedToast: 'A ti fi pamọ́ sínú ìwádìí', shutter: 'Ya fọ́tò' }, tabs: { leaderboard: 'Àtẹ Aṣáájú' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'Àtẹ Àwọn Aṣáájú', subtitle: 'A tò ó ní ìbámu pẹ̀lú iye onírúurú irú ọ̀gbìn tí a ya fọ́tò wọn', species: 'irú ọ̀gbìn {{count}}', uploads: 'fọ́tò {{count}}', you: 'Ìwọ', yourRank: 'Ipò rẹ: #{{rank}}', empty: 'Kò tíì sí àkọsílẹ̀ kankan. Ya fọ́tò ọ̀gbìn kan láti wọ àtẹ náà.', rank: 'Ipò' } },
  ml: { result: { savedToast: 'സർവേയിൽ സംരക്ഷിച്ചു', shutter: 'ഫോട്ടോ എടുക്കുക' }, tabs: { leaderboard: 'ലീഡർബോർഡ്' }, languages: { th: 'ไทย', yo: 'Yorùbá', ml: 'മലയാളം' }, leaderboard: { title: 'ലീഡർബോർഡ്', subtitle: 'ഫോട്ടോ എടുത്ത വ്യത്യസ്ത സ്പീഷീസുകളുടെ എണ്ണം അനുസരിച്ച് ക്രമീകരിച്ചത്', species: '{{count}} സ്പീഷീസ്', uploads: '{{count}} അപ്‌ലോഡുകൾ', you: 'നിങ്ങൾ', yourRank: 'നിങ്ങളുടെ റാങ്ക്: #{{rank}}', empty: 'ഇതുവരെ നിരീക്ഷണങ്ങളില്ല. ബോർഡിൽ കയറാൻ ഒരു ചെടിയുടെ ഫോട്ടോ എടുക്കുക.', rank: 'റാങ്ക്' } },
}
const COMMUNITY = {
  "en": {
    "tabs": {
      "community": "Community"
    },
    "community": {
      "title": "Community",
      "subtitle": "Uses and know-how shared by people, not the AI",
      "forSpecies": "Community notes for {{name}}",
      "notInAi": "Not covered by the AI notes? Add what you know.",
      "empty": "No community notes yet. Be the first to share a use.",
      "share": "Share a use",
      "placeholder": "How do people use this plant where you live?",
      "post": "Post",
      "category": "Category",
      "categories": {
        "edible": "Edible",
        "medicinal": "Medicinal",
        "ecological": "Ecology",
        "cultural": "Cultural",
        "craft": "Craft",
        "other": "Other"
      },
      "helpful": "Helpful",
      "by": "by {{name}}",
      "pickSpecies": "Find a species",
      "yourName": "Your name",
      "disclaimer": "Community notes are personal experiences, not verified advice. Never eat or use a plant based on them."
    }
  },
  "es": {
    "tabs": {
      "community": "Comunidad"
    },
    "community": {
      "title": "Comunidad",
      "subtitle": "Usos y saberes compartidos por personas, no por la IA",
      "forSpecies": "Notas de la comunidad sobre {{name}}",
      "notInAi": "¿La IA no lo menciona? Añade lo que sabes.",
      "empty": "Aún no hay notas de la comunidad. Comparte el primer uso.",
      "share": "Compartir un uso",
      "placeholder": "¿Cómo usa la gente esta planta donde vives?",
      "post": "Publicar",
      "category": "Categoría",
      "categories": {
        "edible": "Comestible",
        "medicinal": "Medicinal",
        "ecological": "Ecología",
        "cultural": "Cultural",
        "craft": "Artesanía",
        "other": "Otro"
      },
      "helpful": "Útil",
      "by": "por {{name}}",
      "pickSpecies": "Buscar una especie",
      "yourName": "Tu nombre",
      "disclaimer": "Las notas de la comunidad son experiencias personales, no consejos verificados. Nunca comas ni uses una planta basándote en ellas."
    }
  },
  "pt": {
    "tabs": {
      "community": "Comunidade"
    },
    "community": {
      "title": "Comunidade",
      "subtitle": "Usos e saberes compartilhados por pessoas, não pela IA",
      "forSpecies": "Notas da comunidade sobre {{name}}",
      "notInAi": "A IA não mencionou? Adicione o que você sabe.",
      "empty": "Ainda não há notas da comunidade. Seja a primeira pessoa a compartilhar um uso.",
      "share": "Compartilhar um uso",
      "placeholder": "Como as pessoas usam esta planta onde você mora?",
      "post": "Publicar",
      "category": "Categoria",
      "categories": {
        "edible": "Comestível",
        "medicinal": "Medicinal",
        "ecological": "Ecologia",
        "cultural": "Cultural",
        "craft": "Artesanato",
        "other": "Outro"
      },
      "helpful": "Útil",
      "by": "por {{name}}",
      "pickSpecies": "Encontrar uma espécie",
      "yourName": "Seu nome",
      "disclaimer": "As notas da comunidade são experiências pessoais, não conselhos verificados. Nunca coma nem use uma planta com base nelas."
    }
  },
  "fr": {
    "tabs": {
      "community": "Communauté"
    },
    "community": {
      "title": "Communauté",
      "subtitle": "Usages et savoirs partagés par des personnes, pas par l'IA",
      "forSpecies": "Notes de la communauté sur {{name}}",
      "notInAi": "L'IA n'en parle pas ? Ajoutez ce que vous savez.",
      "empty": "Aucune note de la communauté pour l'instant. Partagez le premier usage.",
      "share": "Partager un usage",
      "placeholder": "Comment utilise-t-on cette plante là où vous vivez ?",
      "post": "Publier",
      "category": "Catégorie",
      "categories": {
        "edible": "Comestible",
        "medicinal": "Médicinal",
        "ecological": "Écologie",
        "cultural": "Culturel",
        "craft": "Artisanat",
        "other": "Autre"
      },
      "helpful": "Utile",
      "by": "par {{name}}",
      "pickSpecies": "Trouver une espèce",
      "yourName": "Votre nom",
      "disclaimer": "Les notes de la communauté sont des expériences personnelles, pas des conseils vérifiés. Ne mangez ni n'utilisez jamais une plante sur cette base."
    }
  },
  "hi": {
    "tabs": {
      "community": "समुदाय"
    },
    "community": {
      "title": "समुदाय",
      "subtitle": "लोगों द्वारा साझा किए गए उपयोग और अनुभव, एआई के नहीं",
      "forSpecies": "{{name}} पर समुदाय की टिप्पणियाँ",
      "notInAi": "एआई की टिप्पणियों में नहीं है? जो आप जानते हैं, जोड़ें।",
      "empty": "अभी कोई सामुदायिक टिप्पणी नहीं है। पहला उपयोग साझा करें।",
      "share": "उपयोग साझा करें",
      "placeholder": "आपके इलाके में लोग इस पौधे का उपयोग कैसे करते हैं?",
      "post": "पोस्ट करें",
      "category": "श्रेणी",
      "categories": {
        "edible": "खाद्य",
        "medicinal": "औषधीय",
        "ecological": "पारिस्थितिकी",
        "cultural": "सांस्कृतिक",
        "craft": "शिल्प",
        "other": "अन्य"
      },
      "helpful": "उपयोगी",
      "by": "{{name}} द्वारा",
      "pickSpecies": "प्रजाति खोजें",
      "yourName": "आपका नाम",
      "disclaimer": "सामुदायिक टिप्पणियाँ व्यक्तिगत अनुभव हैं, प्रमाणित सलाह नहीं। इनके आधार पर कभी कोई पौधा न खाएँ और न उपयोग करें।"
    }
  },
  "ar": {
    "tabs": {
      "community": "المجتمع"
    },
    "community": {
      "title": "المجتمع",
      "subtitle": "استخدامات ومعارف يشاركها الناس، لا الذكاء الاصطناعي",
      "forSpecies": "ملاحظات المجتمع عن {{name}}",
      "notInAi": "لم يذكره الذكاء الاصطناعي؟ أضف ما تعرفه.",
      "empty": "لا توجد ملاحظات من المجتمع بعد. كن أول من يشارك استخدامًا.",
      "share": "شارك استخدامًا",
      "placeholder": "كيف يستخدم الناس هذا النبات حيث تعيش؟",
      "post": "نشر",
      "category": "الفئة",
      "categories": {
        "edible": "صالح للأكل",
        "medicinal": "طبي",
        "ecological": "بيئي",
        "cultural": "ثقافي",
        "craft": "حِرَفي",
        "other": "أخرى"
      },
      "helpful": "مفيد",
      "by": "بواسطة {{name}}",
      "pickSpecies": "ابحث عن نوع",
      "yourName": "اسمك",
      "disclaimer": "ملاحظات المجتمع تجارب شخصية وليست نصائح موثّقة. لا تأكل أي نبات ولا تستخدمه بناءً عليها أبدًا."
    }
  },
  "th": {
    "tabs": {
      "community": "ชุมชน"
    },
    "community": {
      "title": "ชุมชน",
      "subtitle": "การใช้ประโยชน์และความรู้ที่ผู้คนแบ่งปัน ไม่ใช่จาก AI",
      "forSpecies": "บันทึกจากชุมชนเกี่ยวกับ {{name}}",
      "notInAi": "AI ไม่ได้กล่าวถึงใช่ไหม เพิ่มสิ่งที่คุณรู้",
      "empty": "ยังไม่มีบันทึกจากชุมชน มาเป็นคนแรกที่แบ่งปันการใช้ประโยชน์",
      "share": "แบ่งปันการใช้ประโยชน์",
      "placeholder": "ผู้คนในพื้นที่ของคุณใช้พืชชนิดนี้อย่างไร",
      "post": "โพสต์",
      "category": "หมวดหมู่",
      "categories": {
        "edible": "กินได้",
        "medicinal": "สมุนไพร",
        "ecological": "นิเวศวิทยา",
        "cultural": "วัฒนธรรม",
        "craft": "งานฝีมือ",
        "other": "อื่น ๆ"
      },
      "helpful": "มีประโยชน์",
      "by": "โดย {{name}}",
      "pickSpecies": "ค้นหาชนิดพันธุ์",
      "yourName": "ชื่อของคุณ",
      "disclaimer": "บันทึกจากชุมชนเป็นประสบการณ์ส่วนตัว ไม่ใช่คำแนะนำที่ผ่านการตรวจสอบ ห้ามกินหรือใช้พืชโดยอ้างอิงจากบันทึกเหล่านี้"
    }
  },
  "yo": {
    "tabs": {
      "community": "Àwùjọ"
    },
    "community": {
      "title": "Àwùjọ",
      "subtitle": "Àwọn ìlò àti ìmọ̀ tí àwọn ènìyàn pín, kì í ṣe AI",
      "forSpecies": "Àwọn àkọsílẹ̀ àwùjọ nípa {{name}}",
      "notInAi": "AI kò sọ nípa rẹ̀? Fi ohun tí o mọ̀ kún un.",
      "empty": "Kò tíì sí àkọsílẹ̀ àwùjọ. Jẹ́ ẹni àkọ́kọ́ láti pín ìlò kan.",
      "share": "Pín ìlò kan",
      "placeholder": "Báwo ni àwọn ènìyàn ṣe ń lo ọ̀gbìn yìí níbi tí o ń gbé?",
      "post": "Fi ránṣẹ́",
      "category": "Ẹ̀ka",
      "categories": {
        "edible": "Ṣeé jẹ",
        "medicinal": "Oògùn",
        "ecological": "Àyíká",
        "cultural": "Àṣà",
        "craft": "Iṣẹ́ ọwọ́",
        "other": "Òmíràn"
      },
      "helpful": "Ó wúlò",
      "by": "láti ọwọ́ {{name}}",
      "pickSpecies": "Wá irú ọ̀gbìn",
      "yourName": "Orúkọ rẹ",
      "disclaimer": "Àwọn àkọsílẹ̀ àwùjọ jẹ́ ìrírí ara ẹni, kì í ṣe ìmọ̀ràn tí a ti fẹ̀rí rẹ̀. Má jẹ tàbí lo ọ̀gbìn kankan nítorí wọn."
    }
  },
  "ml": {
    "tabs": {
      "community": "സമൂഹം"
    },
    "community": {
      "title": "സമൂഹം",
      "subtitle": "ആളുകൾ പങ്കുവെച്ച ഉപയോഗങ്ങളും അറിവുകളും, AI യുടേതല്ല",
      "forSpecies": "{{name}} നെക്കുറിച്ചുള്ള സമൂഹ കുറിപ്പുകൾ",
      "notInAi": "AI കുറിപ്പുകളിൽ ഇല്ലേ? നിങ്ങൾക്കറിയാവുന്നത് ചേർക്കുക.",
      "empty": "ഇതുവരെ സമൂഹ കുറിപ്പുകളില്ല. ഒരു ഉപയോഗം ആദ്യം പങ്കുവെക്കുക.",
      "share": "ഒരു ഉപയോഗം പങ്കുവെക്കുക",
      "placeholder": "നിങ്ങൾ താമസിക്കുന്നിടത്ത് ആളുകൾ ഈ ചെടി എങ്ങനെ ഉപയോഗിക്കുന്നു?",
      "post": "പോസ്റ്റ് ചെയ്യുക",
      "category": "വിഭാഗം",
      "categories": {
        "edible": "ഭക്ഷ്യയോഗ്യം",
        "medicinal": "ഔഷധം",
        "ecological": "പരിസ്ഥിതി",
        "cultural": "സാംസ്കാരികം",
        "craft": "കരകൗശലം",
        "other": "മറ്റുള്ളവ"
      },
      "helpful": "ഉപകാരപ്രദം",
      "by": "{{name}} എഴുതിയത്",
      "pickSpecies": "ഒരു സ്പീഷീസ് കണ്ടെത്തുക",
      "yourName": "നിങ്ങളുടെ പേര്",
      "disclaimer": "സമൂഹ കുറിപ്പുകൾ വ്യക്തിപരമായ അനുഭവങ്ങളാണ്, പരിശോധിച്ച ഉപദേശമല്ല. ഇവയെ ആശ്രയിച്ച് ഒരിക്കലും ഒരു ചെടി കഴിക്കുകയോ ഉപയോഗിക്കുകയോ ചെയ്യരുത്."
    }
  }
}

const WORLD = {
  "en": {
    "world": {
      "title": "Nature stewards around the world",
      "subtitle": "Every dot is a person who scanned a plant there. Tap one to see what they found.",
      "scannedHere": "scanned {{species}} here"
    },
    "passport": {
      "title": "Your steward passport",
      "scans": "{{count}} scans",
      "places": "{{count}} places",
      "species": "{{count}} species",
      "since": "Steward since {{date}}",
      "empty": "Scan a plant to earn your first stamp."
    }
  },
  "es": {
    "world": {
      "title": "Guardianes de la naturaleza en el mundo",
      "subtitle": "Cada punto es una persona que escaneó una planta allí. Toca uno para ver qué encontró.",
      "scannedHere": "escaneó {{species}} aquí"
    },
    "passport": {
      "title": "Tu pasaporte de guardián",
      "scans": "{{count}} escaneos",
      "places": "{{count}} lugares",
      "species": "{{count}} especies",
      "since": "Guardián desde {{date}}",
      "empty": "Escanea una planta para ganar tu primer sello."
    }
  },
  "pt": {
    "world": {
      "title": "Guardiões da natureza pelo mundo",
      "subtitle": "Cada ponto é uma pessoa que escaneou uma planta ali. Toque em um para ver o que encontrou.",
      "scannedHere": "escaneou {{species}} aqui"
    },
    "passport": {
      "title": "Seu passaporte de guardião",
      "scans": "{{count}} escaneamentos",
      "places": "{{count}} lugares",
      "species": "{{count}} espécies",
      "since": "Guardião desde {{date}}",
      "empty": "Escaneie uma planta para ganhar seu primeiro carimbo."
    }
  },
  "fr": {
    "world": {
      "title": "Gardiens de la nature dans le monde",
      "subtitle": "Chaque point est une personne qui a scanné une plante à cet endroit. Touchez-en un pour voir sa trouvaille.",
      "scannedHere": "a scanné {{species}} ici"
    },
    "passport": {
      "title": "Votre passeport de gardien",
      "scans": "{{count}} scans",
      "places": "{{count}} lieux",
      "species": "{{count}} espèces",
      "since": "Gardien depuis {{date}}",
      "empty": "Scannez une plante pour obtenir votre premier tampon."
    }
  },
  "hi": {
    "world": {
      "title": "दुनिया भर के प्रकृति संरक्षक",
      "subtitle": "हर बिंदु वह व्यक्ति है जिसने वहाँ किसी पौधे को स्कैन किया। देखने के लिए किसी बिंदु पर टैप करें।",
      "scannedHere": "यहाँ {{species}} स्कैन किया"
    },
    "passport": {
      "title": "आपका संरक्षक पासपोर्ट",
      "scans": "{{count}} स्कैन",
      "places": "{{count}} स्थान",
      "species": "{{count}} प्रजातियाँ",
      "since": "{{date}} से संरक्षक",
      "empty": "पहली मुहर पाने के लिए किसी पौधे को स्कैन करें।"
    }
  },
  "ar": {
    "world": {
      "title": "حُرّاس الطبيعة حول العالم",
      "subtitle": "كل نقطة شخص مسح نبتة هناك. اضغط على نقطة لترى ما وجده.",
      "scannedHere": "مسح {{species}} هنا"
    },
    "passport": {
      "title": "جواز الحارس الخاص بك",
      "scans": "{{count}} عملية مسح",
      "places": "{{count}} أماكن",
      "species": "{{count}} نوعًا",
      "since": "حارس منذ {{date}}",
      "empty": "امسح نبتة لتحصل على ختمك الأول."
    }
  },
  "th": {
    "world": {
      "title": "ผู้พิทักษ์ธรรมชาติทั่วโลก",
      "subtitle": "แต่ละจุดคือคนที่สแกนพืชที่นั่น แตะเพื่อดูว่าเจออะไร",
      "scannedHere": "สแกน {{species}} ที่นี่"
    },
    "passport": {
      "title": "พาสปอร์ตผู้พิทักษ์ของคุณ",
      "scans": "{{count}} ครั้ง",
      "places": "{{count}} แห่ง",
      "species": "{{count}} ชนิด",
      "since": "เป็นผู้พิทักษ์ตั้งแต่ {{date}}",
      "empty": "สแกนพืชเพื่อรับตราประทับแรกของคุณ"
    }
  },
  "yo": {
    "world": {
      "title": "Àwọn olùtọ́jú ìṣẹ̀dá kárí ayé",
      "subtitle": "Àmì kọ̀ọ̀kan jẹ́ ẹni tí ó ya fọ́tò ọ̀gbìn níbẹ̀. Tẹ ọ̀kan láti rí ohun tí ó rí.",
      "scannedHere": "ya fọ́tò {{species}} níbí"
    },
    "passport": {
      "title": "Ìwé ìrìnnà olùtọ́jú rẹ",
      "scans": "fọ́tò {{count}}",
      "places": "ibi {{count}}",
      "species": "irú ọ̀gbìn {{count}}",
      "since": "Olùtọ́jú láti {{date}}",
      "empty": "Ya fọ́tò ọ̀gbìn kan láti gba àmì àkọ́kọ́ rẹ."
    }
  },
  "ml": {
    "world": {
      "title": "ലോകമെമ്പാടുമുള്ള പ്രകൃതി സംരക്ഷകർ",
      "subtitle": "ഓരോ ബിന്ദുവും അവിടെ ഒരു ചെടി സ്കാൻ ചെയ്ത ഒരാളാണ്. അവർ കണ്ടെത്തിയത് കാണാൻ ടാപ്പ് ചെയ്യുക.",
      "scannedHere": "ഇവിടെ {{species}} സ്കാൻ ചെയ്തു"
    },
    "passport": {
      "title": "നിങ്ങളുടെ സംരക്ഷക പാസ്‌പോർട്ട്",
      "scans": "{{count}} സ്കാനുകൾ",
      "places": "{{count}} സ്ഥലങ്ങൾ",
      "species": "{{count}} സ്പീഷീസ്",
      "since": "{{date}} മുതൽ സംരക്ഷകൻ",
      "empty": "ആദ്യ സ്റ്റാമ്പ് നേടാൻ ഒരു ചെടി സ്കാൻ ചെയ്യുക."
    }
  }
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
  merge(data, COMMUNITY[lang])
  merge(data, WORLD[lang])
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  console.log(`[${lang}] patched`)
}
