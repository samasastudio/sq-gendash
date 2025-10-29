export type NumberFormat = "currency" | "percent" | "number";

export const formatNumber = (value: number, format: NumberFormat) => {
  const formatter =
    format === "currency"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      : format === "percent"
        ? new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 })
        : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

  return formatter.format(value);
};
