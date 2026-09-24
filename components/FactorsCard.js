import { Scale } from 'lucide-react';
import TypeIcon from '@/components/TypeIcon';
import { ACTIVITY_TYPES, TYPE_KEYS, perUnit } from '@/lib/constants';

// Reference grid of all emission factors, read straight from the central constants file.
export default function FactorsCard() {
  return (
    <section className="card factors-card" aria-labelledby="factors-heading">
      <h2 id="factors-heading">
        <Scale size={20} aria-hidden="true" /> Emission factors
      </h2>
      <ul className="factor-grid">
        {TYPE_KEYS.map((key) => {
          const { label, unit, factor } = ACTIVITY_TYPES[key];
          return (
            <li key={key} className="factor-tile">
              <TypeIcon type={key} />
              <span className="factor-text">
                <span className="factor-label">{label}</span>
                <span className="factor-value">
                  <strong>{factor.toFixed(2)}</strong> kg CO2 / {perUnit(unit)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
