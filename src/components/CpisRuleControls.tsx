import type { AccountConfig, ListingFormat, TitleRuleOptions } from '../types';
import { supportsCompetitorTitles } from '../cpis/titles/competitorRules';
import { usesFrontMultiFormat } from '../cpis/templates/premiumListingFormat';
import { Field } from './ui';

export function CpisRuleControls({ accounts, value = {}, onChange }: {
  accounts: AccountConfig[]; value?: TitleRuleOptions; onChange: (value: TitleRuleOptions) => void;
}) {
  const competitorIds = value.competitorAccountIds ?? [];
  return (
    <div className="cpis-rule-controls">
      <h3>CPIS title rules</h3>
      <p className="muted-hint">Regular uses each account’s title style. Multi uses one parent title for all parts in the selected front collection. Choose the format that matches the product.</p>
      <div className="form-grid">
        {accounts.filter(account => supportsCompetitorTitles(account.id) || usesFrontMultiFormat(account.id)).map(account => (
          <Field key={account.id} label={account.name}>
            {supportsCompetitorTitles(account.id) ? (
              <select aria-label={`${account.name} title rules`} value={competitorIds.includes(account.id) ? 'competitor' : 'regular'}
                onChange={event => onChange({ ...value, competitorAccountIds: event.target.value === 'competitor'
                  ? [...new Set([...competitorIds, account.id])] : competitorIds.filter(id => id !== account.id) })}>
                <option value="regular">Our rules (CPIS)</option>
                <option value="competitor">Competitor research rules (CPIS)</option>
              </select>
            ) : (
              <select aria-label={`${account.name} listing format`} value={value.formats?.[account.id] ?? 'regular'}
                onChange={event => onChange({ ...value, formats: { ...value.formats, [account.id]: event.target.value as ListingFormat } })}>
                <option value="regular">Regular — individual parts</option>
                <option value="multi">Multi — full front collection</option>
                <option value="multi-bottoms">Multi Bottoms — front bottoms only</option>
              </select>
            )}
          </Field>
        ))}
        {accounts.some(account => competitorIds.includes(account.id)) && (
          <Field label="Recorded trim" hint="competitor rules only; optional">
            <input aria-label="Recorded trim" value={value.trim ?? ''} placeholder="e.g. Lariat — only if recorded"
              onChange={event => onChange({ ...value, trim: event.target.value })} />
          </Field>
        )}
      </div>
      <p className="muted-hint">DSA titles use Beige for Tan. Premium console covers and foam cushions use their own product wording. Saved account customizations remain available in Account Settings.</p>
    </div>
  );
}
