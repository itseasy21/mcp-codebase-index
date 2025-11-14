/**
 * Sample TypeScript file for testing parser
 */

// A simple function
export function add(a: number, b: number): number {
  return a + b;
}

// A class with methods
export class Calculator {
  private history: number[] = [];

  /**
   * Multiply two numbers
   */
  public multiply(a: number, b: number): number {
    const result = a * b;
    this.history.push(result);
    return result;
  }

  /**
   * Get calculation history
   */
  public getHistory(): number[] {
    return this.history;
  }
}

// An interface
export interface User {
  id: string;
  name: string;
  email: string;
}

// A type alias
export type UserId = string | number;

// An enum
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

// An async function
export async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}
