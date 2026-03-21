export type CharacterState = "correct" | "wrong" | "pending";

export function getCharacterStates(target: string, input: string): CharacterState[] {
  return Array.from(target).map((character, index) => {
    const typed = input[index];

    if (typed === undefined) {
      return "pending";
    }

    return typed === character ? "correct" : "wrong";
  });
}

export function countIncrementalMistakes(
  previousInput: string,
  nextInput: string,
  target: string
): number {
  if (!nextInput.startsWith(previousInput) || nextInput.length <= previousInput.length) {
    return 0;
  }

  let nextMistakes = 0;

  for (let index = previousInput.length; index < nextInput.length; index += 1) {
    if (nextInput[index] !== target[index]) {
      nextMistakes += 1;
    }
  }

  return nextMistakes;
}
