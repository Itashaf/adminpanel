import { Country, State, City } from 'country-state-city';

const INDIA_COUNTRY_CODE = 'IN';

export function getNationalityOptions() {
  const countries = Country.getAllCountries();
  const india = countries.find((country) => country.isoCode === INDIA_COUNTRY_CODE);
  const others = countries
    .filter((country) => country.isoCode !== INDIA_COUNTRY_CODE)
    .sort((a, b) => a.name.localeCompare(b.name));
  const ordered = india ? [india, ...others] : others;
  return ordered.map((country) => ({ value: country.name, label: country.name }));
}

export function getIndianStates() {
  return State.getStatesOfCountry(INDIA_COUNTRY_CODE).map((state) => ({
    value: state.isoCode,
    label: state.name,
  }));
}

export function getCitiesForState(stateIsoCode) {
  if (!stateIsoCode) return [];
  return City.getCitiesOfState(INDIA_COUNTRY_CODE, stateIsoCode).map((city) => ({
    value: city.name,
    label: city.name,
  }));
}

export function getStateNameByCode(stateIsoCode) {
  return State.getStateByCodeAndCountry(stateIsoCode, INDIA_COUNTRY_CODE)?.name || '';
}

export function getStateCodeByName(stateName) {
  if (!stateName) return '';
  return State.getStatesOfCountry(INDIA_COUNTRY_CODE).find((state) => state.name === stateName)?.isoCode || '';
}
