import json
ov = json.load(open('tmp/pipeline_trace_modbus.json'))
print('pipeline_trace stage1.c2s ranking:')
for r in ov['stage1']['c2s']['rows']:
    mark = ' <== TRUE' if r['is_true'] else ''
    print(f"  {r['offset']}/{r['length']} | clus={r['n_clusters']} dist={r['n_distinct']} sing={r['singletons']} | p_m={r['p_m']:.4f} p_r={r['p_r']:.4f} p_s={r['p_s']:.4f} p_d={r['p_d']:.2f} p_f={r['p_f']:.4f} | rank={r['rank']}{mark}")
print()
print('pipeline_trace stage2.c2s:')
for r in ov['stage2']['c2s']['rows']:
    mark = ' <== TRUE' if r['is_true'] else ''
    print(f"  {r['offset']}/{r['length']} | p_bit={r['p_bit']:.4f} p_offset={r['p_offset']:.2f} p_f={r['p_f']:.4f} posterior={r['posterior']:.6f} rank={r['rank']}{mark}")
print('winner:', ov['stage2']['c2s']['winner'])
print()
print('pool:', [(c['offset'], c['length']) for c in ov['candidates']['pool']])
print('S:', ov['candidates']['S'])
print('excluded:', ov['candidates']['excluded'])
print('rescued:', ov['candidates']['rescued'])
print('dropped:', ov['candidates']['dropped'])
