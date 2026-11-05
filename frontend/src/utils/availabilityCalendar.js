const pad = (value) => String(value).padStart(2, '0');

export const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayFirstOffset + 1;
    return day < 1 || day > daysInMonth ? null : `${year}-${pad(month + 1)}-${pad(day)}`;
  });
};
