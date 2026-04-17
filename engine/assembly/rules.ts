import { RULE_MULTIPLES_OF_3, RULE_FACTORS_OF_24, RULE_PRIME_NUMBERS, RULE_GREATER_THAN_50, RULE_EQUALS_7 } from './types'

/**
 * Check if a number is prime
 */
export function isPrime(n: i32): boolean {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  for (let i: i32 = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false
  }
  return true
}

/**
 * Check if a is a factor of b
 */
export function isFactor(a: i32, b: i32): boolean {
  return b % a === 0
}

/**
 * Evaluate if a number matches the current rule
 */
export function matchesRule(number: i32, rule: i32): boolean {
  if (rule === RULE_MULTIPLES_OF_3) {
    return number % 3 === 0
  }
  if (rule === RULE_FACTORS_OF_24) {
    return isFactor(number, 24)
  }
  if (rule === RULE_PRIME_NUMBERS) {
    return isPrime(number)
  }
  if (rule === RULE_GREATER_THAN_50) {
    return number > 50
  }
  if (rule === RULE_EQUALS_7) {
    return number === 7
  }
  return false
}

/**
 * Get next rule for level progression
 */
export function getNextRule(currentRule: i32): i32 {
  const nextRule = (currentRule + 1) % 5
  return nextRule
}
