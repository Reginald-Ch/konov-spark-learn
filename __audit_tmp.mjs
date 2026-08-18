import { runModule, runFunction } from './supabase/functions/_shared/pyInterpreter/evaluator.ts';
import { PROJECT_SCAFFOLDS, PROJECT_SCAFFOLDS_BLANK } from './src/components/hackathon/projectScaffolds.ts';
for (const [label, tbl] of [['guided', PROJECT_SCAFFOLDS], ['blank', PROJECT_SCAFFOLDS_BLANK]]) {
  for (const k of Object.keys(tbl)) {
    const r = await runModule(tbl[k].main, { timeoutMs: 4000, maxSteps: 500000 });
    console.log(`--- ${label}/${k}: ok=${r.ok} err=${r.errorType||''} ${r.errorMessage||''} line=${r.errorLine??''}`);
    console.log('STDOUT:', JSON.stringify(r.stdout).slice(0,500));
  }
}
