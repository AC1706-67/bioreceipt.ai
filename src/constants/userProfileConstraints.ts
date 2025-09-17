export const USER_PROFILE_CONSTRAINTS = {
  healthInterests: { minItems: 1, maxItems: 6 },
  goals: { minItems: 1, maxItems: 5 },
  preferences: { maxCaloriesPerTip: 1500 },
};

export default USER_PROFILE_CONSTRAINTS;