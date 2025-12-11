// Utilidades para manejo de fechas sin problemas de zona horaria

/**
 * Extrae solo la fecha (YYYY-MM-DD) de un timestamp ISO
 * @param {string} isoString - Timestamp en formato ISO (ej: 2025-12-10T15:30:45.000Z)
 * @returns {string|null} Fecha en formato YYYY-MM-DD sin considerar zona horaria
 */
export const getDateStringFromISO = (isoString) => {
  if (!isoString) return null
  // Tomar solo la parte de fecha sin considerar zona horaria
  return isoString.split('T')[0]
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} Fecha actual en formato YYYY-MM-DD
 */
export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]
}

/**
 * Compara si una fecha (en formato ISO o simple) está dentro de un rango
 * @param {string} dateToCheck - Fecha a verificar (ISO string o YYYY-MM-DD)
 * @param {string} startDate - Fecha inicial (YYYY-MM-DD)
 * @param {string} endDate - Fecha final (YYYY-MM-DD)
 * @returns {boolean} True si la fecha está dentro del rango
 */
export const isDateInRange = (dateToCheck, startDate, endDate) => {
  const dateString = getDateStringFromISO(dateToCheck) || dateToCheck
  return dateString >= startDate && dateString <= endDate
}

/**
 * Formatea un timestamp ISO a una cadena legible en zona horaria local
 * @param {string} isoString - Timestamp en formato ISO
 * @param {string} locale - Locale para formateo (ej: 'es-ES', 'en-US')
 * @returns {string} Fecha y hora formateadas
 */
export const formatLocalDateTime = (isoString, locale = 'es-ES') => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString(locale, { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Formatea solo la fecha de un timestamp ISO
 * @param {string} isoString - Timestamp en formato ISO
 * @param {string} locale - Locale para formateo
 * @returns {string} Solo la fecha formateada
 */
export const formatLocalDate = (isoString, locale = 'es-ES') => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString(locale, { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  })
}
