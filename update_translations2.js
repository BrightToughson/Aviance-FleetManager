const fs = require('fs');
const path = require('path');

const localesDir = 'b:/All codes/React Native/Work Projects/Aviance Fleet Management system/Aviance-FleetManager/src/i18n/locales';

const translations = {
  en: {
    "insp_title": "Inspections (DVIR)",
    "insp_subtitle": "Daily vehicle inspection reports and compliance logs",
    "insp_all": "All Inspections",
    "insp_stat_today": "Today",
    "insp_stat_passed": "Passed",
    "insp_stat_failed": "Failed",
    "insp_search": "Search by vehicle or driver...",
    "insp_recent": "Recent Inspections",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Vehicle",
    "insp_col_driver": "Driver",
    "insp_col_datetime": "Date & Time",
    "insp_col_date": "Date",
    "insp_col_defects": "Defects",
    "insp_col_status": "Status",
    "insp_status_passed": "Passed",
    "insp_status_failed": "Failed",
    "insp_status_pass_w_defects": "Pass w/ Defects"
  },
  tw: {
    "insp_title": "Nnwɛeɛ (DVIR)",
    "insp_subtitle": "Lorry nnwɛeɛ ne mmara nkrataa daa",
    "insp_all": "Nnwɛeɛ Nyinaa",
    "insp_stat_today": "Ɛnnɛ",
    "insp_stat_passed": "Atwam",
    "insp_stat_failed": "Antwam",
    "insp_search": "Hwehwɛ lorry anaa kwanhwɛfoɔ...",
    "insp_recent": "Nnwɛeɛ a Wɔyɛe Nnansa Yi",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Lorry",
    "insp_col_driver": "Kwanhwɛfoɔ",
    "insp_col_datetime": "Da ne Bere",
    "insp_col_date": "Da",
    "insp_col_defects": "Mfomsoɔ",
    "insp_col_status": "Tebea",
    "insp_status_passed": "Atwam",
    "insp_status_failed": "Antwam",
    "insp_status_pass_w_defects": "Atwam nso wanya mfomsoɔ"
  },
  ar: {
    "insp_title": "عمليات التفتيش (DVIR)",
    "insp_subtitle": "تقارير فحص المركبات اليومية وسجلات الامتثال",
    "insp_all": "جميع الفحوصات",
    "insp_stat_today": "اليوم",
    "insp_stat_passed": "نجح",
    "insp_stat_failed": "فشل",
    "insp_search": "البحث بالمركبة أو السائق...",
    "insp_recent": "الفحوصات الأخيرة",
    "insp_col_id": "المعرف",
    "insp_col_vehicle": "المركبة",
    "insp_col_driver": "السائق",
    "insp_col_datetime": "التاريخ والوقت",
    "insp_col_date": "التاريخ",
    "insp_col_defects": "العيوب",
    "insp_col_status": "الحالة",
    "insp_status_passed": "نجح",
    "insp_status_failed": "فشل",
    "insp_status_pass_w_defects": "نجح مع عيوب"
  },
  fr: {
    "insp_title": "Inspections (DVIR)",
    "insp_subtitle": "Rapports d'inspection quotidiens et journaux de conformité",
    "insp_all": "Toutes les Inspections",
    "insp_stat_today": "Aujourd'hui",
    "insp_stat_passed": "Réussi",
    "insp_stat_failed": "Échoué",
    "insp_search": "Rechercher par véhicule ou conducteur...",
    "insp_recent": "Inspections Récentes",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Véhicule",
    "insp_col_driver": "Conducteur",
    "insp_col_datetime": "Date et Heure",
    "insp_col_date": "Date",
    "insp_col_defects": "Défauts",
    "insp_col_status": "Statut",
    "insp_status_passed": "Réussi",
    "insp_status_failed": "Échoué",
    "insp_status_pass_w_defects": "Réussi avec défauts"
  },
  es: {
    "insp_title": "Inspecciones (DVIR)",
    "insp_subtitle": "Reportes de inspección diaria y registros de cumplimiento",
    "insp_all": "Todas las Inspecciones",
    "insp_stat_today": "Hoy",
    "insp_stat_passed": "Aprobado",
    "insp_stat_failed": "Reprobado",
    "insp_search": "Buscar por vehículo o conductor...",
    "insp_recent": "Inspecciones Recientes",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Vehículo",
    "insp_col_driver": "Conductor",
    "insp_col_datetime": "Fecha y Hora",
    "insp_col_date": "Fecha",
    "insp_col_defects": "Defectos",
    "insp_col_status": "Estado",
    "insp_status_passed": "Aprobado",
    "insp_status_failed": "Reprobado",
    "insp_status_pass_w_defects": "Aprobado con Defectos"
  },
  ha: {
    "insp_title": "Bincike (DVIR)",
    "insp_subtitle": "Rahotannin binciken mota na yau da kullun da rubuce-rubucen bin ƙa'ida",
    "insp_all": "Dukkan Bincike",
    "insp_stat_today": "Yau",
    "insp_stat_passed": "An Ci",
    "insp_stat_failed": "An Fadi",
    "insp_search": "Nemo mota ko direba...",
    "insp_recent": "Binciken Kwanan Nan",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Mota",
    "insp_col_driver": "Direba",
    "insp_col_datetime": "Kwanan wata da Lokaci",
    "insp_col_date": "Kwanan wata",
    "insp_col_defects": "Lalacewa",
    "insp_col_status": "Matsayi",
    "insp_status_passed": "An Ci",
    "insp_status_failed": "An Fadi",
    "insp_status_pass_w_defects": "An Ci tare da Lalacewa"
  },
  ga: {
    "insp_title": "Hwɛmɔ (DVIR)",
    "insp_subtitle": "Da fɛɛ da lɔrry hwɛmɔ nkrataa kɛ mla kwɛmɔ",
    "insp_all": "Hwɛmɔi Fɛɛ",
    "insp_stat_today": "Ŋmɛnɛ",
    "insp_stat_passed": "Etswa",
    "insp_stat_failed": "Etswaa",
    "insp_search": "Tao lɔrry loo tsɔɔlɔ...",
    "insp_recent": "Hwɛmɔi aŋmɛnɛŋmɛnɛ nɛɛ",
    "insp_col_id": "ID",
    "insp_col_vehicle": "Lɔrry",
    "insp_col_driver": "Tsɔɔlɔ",
    "insp_col_datetime": "Gbi kɛ Be",
    "insp_col_date": "Gbi",
    "insp_col_defects": "Mfomsoi",
    "insp_col_status": "Te eji ha nɔ",
    "insp_status_passed": "Etswa",
    "insp_status_failed": "Etswaa",
    "insp_status_pass_w_defects": "Etswa kɛ mfomsoi"
  }
};

const languages = ['en', 'tw', 'ar', 'fr', 'es', 'ha', 'ga'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const newLangKeys = translations[lang];
      if (newLangKeys) {
        Object.assign(data, newLangKeys);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Updated ${lang}.json`);
      }
    } catch (e) {
      console.error(`Failed to process ${lang}.json:`, e);
    }
  }
});
