import { Option } from 'ts-option';


export function ifblock<W>(condition: boolean): { let: (_do: (() => W), _else: () => W) => W } {
    return {
      let: condition === true ? (_do: (() => W), _else: () => W) =>
        _do() : (_do: (() => W), _else?: () => W) => { return _else();
        }
    };
  }

  export const block = <T, W>(
    func: (value: T) => W,
    _else?: () => W
  ): ((value?: T) => W) => {
    return (value?: T) => {
      return value !== null && value !== undefined
        ? func(value)
        : _else !== null
        ? _else()
        : null;
    };
  };

  export const mapNotNone = <T, W>(func: (T) => Option<W>): (array: Array<T>) => Array<W> => {
    return (array: Array<T>) => {
      return array.map(e => func(e)).filter((e: Option<W>) => e.isDefined).map(e => e.getOrElse(null));
    }
  }