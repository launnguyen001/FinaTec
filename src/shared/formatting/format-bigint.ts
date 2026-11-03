export function formatBigIntVi(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
