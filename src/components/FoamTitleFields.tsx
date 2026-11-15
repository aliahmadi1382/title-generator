import { FOAM_OPTIONS, type FoamTitleInput } from '../cpis/foamTitle';
import { Field } from './ui';

export const emptyFoam: FoamTitleInput = { row: '', side: '', part: '', ac: '', color: '' };
export function FoamTitleFields({ value = emptyFoam, onChange }: { value?: FoamTitleInput; onChange: (value: FoamTitleInput) => void }) {
  return (
    <div className="cpis-rule-controls">
      <h3>Premium foam cushion</h3>
      <p className="muted-hint">Foam is a separate product. Record its physical position, ventilation and own color; seat-cover material and color do not carry over.</p>
      <div className="form-grid">
        {([['row', 'Seat row'], ['side', 'Physical side'], ['part', 'Seat part'], ['ac', 'A/C configuration']] as const).map(([key, label]) => (
          <Field key={key} label={label} required>
            <select aria-label={`Foam ${label}`} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })}>
              <option value="">Select…</option>
              {Object.entries(FOAM_OPTIONS[key]).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </Field>
        ))}
        <Field label="Foam color" required>
          <input aria-label="Foam color" value={value.color} onChange={event => onChange({ ...value, color: event.target.value })} placeholder="e.g. White" />
        </Field>
      </div>
    </div>
  );
}
