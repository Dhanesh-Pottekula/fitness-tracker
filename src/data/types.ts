export interface RibbonColors {
  bg: string;
  bgEnd: string;
  text: string;
  muted: string;
  icon: string;
  stripe: string;
  border: string;
}

export interface Ribbon extends RibbonColors {
  bank: string;
  account: string;
  amount: string;
}

export interface CreditCard {
  name: string;
  amount: number;
  note: string;
}

export interface LoanTrackerItem {
  id: string;
  title: string;
  lender: string;
  progress: number;
  amountLeftValue: number;
  progressLabel: string;
  headline: string;
  amountLeft: string;
  support: string;
  detailRows: { label: string; value: string }[];
  schedule: string[];
}

export interface Person {
  name: string;
  amount: number;
}

export interface FinanceTransaction {
  date: string;
  time: string;
  category: string;
  subCategory: string;
  note: string;
  amount: number;
  paymentMethod?: string;
  friend?: string;
}

export type FoodUnit = 'g' | 'piece';

export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  unit?: FoodUnit;
  gramsPerPiece?: number;
  custom?: boolean;
}

export interface MealItem {
  foodId: string;
  grams: number;
}

export interface Meal {
  time: string;
  label: string;
  items: MealItem[];
}

export interface DailyEntry {
  water: number;
  weight: number;
  meals: Meal[];
}

export interface MealTemplate {
  id: string;
  name: string;
  label: string;
  items: MealItem[];
  createdAt: string;
}

export interface PhysicalHealth {
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
    weight: number;
  };
  foods: Food[];
  daily: Record<string, DailyEntry>;
  mealTemplates: MealTemplate[];
}

export interface SpendEntry {
  id: string;
  name: string;
  amount: number;
  recurring: boolean;
  managed?: boolean;
  details?: {
    date?: string;
    transaction?: FinanceTransaction;
  } | null;
}

export type MonthlySpends = Record<string, SpendEntry[]>;

export interface AppData {
  ribbons: Ribbon[];
  creditCards: CreditCard[];
  loanTrackerItems: LoanTrackerItem[];
  peopleToGiveMoney: Person[];
  financeTransactions: FinanceTransaction[];
  physicalHealth: PhysicalHealth;
  monthlySpends: MonthlySpends;
}
