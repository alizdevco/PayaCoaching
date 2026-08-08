// Static province → cities reference data for profile forms.

import iranCitiesJson from "iran-cities-json";

const { ostan, shahr } = iranCitiesJson;

function normalizeProvinceName(name) {
  return name.replace(/\s+/g, "");
}

const ostanIdByNormalizedName = Object.fromEntries(
  ostan.map((province) => [normalizeProvinceName(province.name), province.id]),
);

export const IRAN_PROVINCES = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];

export const CITIES_BY_PROVINCE = Object.fromEntries(
  IRAN_PROVINCES.map((province) => {
    const ostanId = ostanIdByNormalizedName[normalizeProvinceName(province)];
    const cities = shahr
      .filter((city) => city.ostan === ostanId)
      .map((city) => city.name);

    return [province, cities];
  }),
);

export function getCitiesForProvince(province) {
  return CITIES_BY_PROVINCE[province] ?? [];
}
