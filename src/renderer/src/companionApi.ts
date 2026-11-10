export function companionApi(): Window["companion"] | undefined {
  return (window as Window & { companion?: Window["companion"] }).companion;
}
