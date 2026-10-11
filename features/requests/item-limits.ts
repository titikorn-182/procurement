/** Existing request-item limits shared by client validation and server schemas. */
export const requestItemLimits = {
  count: 200,
  lineNumber: 1_000,
  descriptionLength: 500,
  unitLength: 100,
  priceSourceLength: 500,
  quantity: 999_999_999,
  price: 999_999_999_999.99,
} as const;
