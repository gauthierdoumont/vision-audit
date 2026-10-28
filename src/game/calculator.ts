// Calculatrice du joueur : analyse d'expressions sans eval (nombres à la belge, + − × ÷, parenthèses, %).
// Audit Detective — créé par Gauthier Doumont.

type Token = { type: 'number'; value: number } | { type: 'op'; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const source = input.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
  for (let i = 0; i < source.length; ) {
    const ch = source[i]!;
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < source.length && /[0-9.]/.test(source[j]!)) j++;
      const value = Number(source.slice(i, j));
      if (Number.isNaN(value)) throw new Error('Nombre invalide');
      tokens.push({ type: 'number', value });
      i = j;
    } else if ('+-*/()%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else {
      throw new Error(`Caractère inattendu : ${ch}`);
    }
  }
  return tokens;
}

/** Évalue une expression ; renvoie NaN si elle est invalide (ou division par zéro). */
export function evaluate(input: string): number {
  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch {
    return NaN;
  }
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (value: string) => peek()?.type === 'op' && peek()!.value === value;

  // expression := terme (('+' | '-') terme)*
  function expression(): number {
    let value = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++]!.value;
      value = op === '+' ? value + term() : value - term();
    }
    return value;
  }
  // terme := facteur (('*' | '/') facteur)*
  function term(): number {
    let value = factor();
    while (isOp('*') || isOp('/')) {
      const op = tokens[pos++]!.value;
      const right = factor();
      value = op === '*' ? value * right : right === 0 ? NaN : value / right;
    }
    return value;
  }
  // facteur := '-' facteur | nombre '%'? | '(' expression ')'
  function factor(): number {
    if (isOp('-')) {
      pos++;
      return -factor();
    }
    const token = tokens[pos++];
    if (!token) throw new Error('Expression incomplète');
    if (token.type === 'number') {
      if (isOp('%')) {
        pos++;
        return token.value / 100;
      }
      return token.value;
    }
    if (token.value === '(') {
      const value = expression();
      if (!isOp(')')) throw new Error('Parenthèse manquante');
      pos++;
      return value;
    }
    throw new Error('Expression invalide');
  }

  try {
    const value = expression();
    return pos === tokens.length ? value : NaN;
  } catch {
    return NaN;
  }
}

/** Affichage à la belge, deux décimales au plus. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Erreur';
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100);
}
