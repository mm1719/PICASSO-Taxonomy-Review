"""Generate tiny invented UI fixtures; never read research files or call an API."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
DATA = PUBLIC / 'data'
DATA_FILES = {
    'taxonomy_tree.json', 'valid_class_candidates.csv', 'class_image_samples.json',
    'worms_lineages.json', 'invalid_label_groups.json', 'mapping_status.json',
    'demo_data_metadata.json',
}
PUBLIC_FILES = {f'data/{name}' for name in DATA_FILES} | {
    'samples/valid-1.svg', 'samples/valid-2.svg', 'samples/valid-3.svg',
    'invalid-samples/invalid-1.svg', 'invalid-samples/invalid-2.svg',
}
PUBLIC_DIRS = {'data', 'samples', 'invalid-samples'}


def check_public_tree(*, complete: bool) -> None:
    """Reject unexpected assets rather than deleting or publishing them."""
    if PUBLIC.is_symlink():
        raise ValueError('public must not be a symlink')
    present = set()
    if PUBLIC.exists():
        if not PUBLIC.is_dir():
            raise ValueError('public must be a directory')
        for path in PUBLIC.rglob('*'):
            relative = path.relative_to(PUBLIC).as_posix()
            if path.is_symlink():
                raise ValueError(f'Symlink is not permitted: {relative}')
            if path.is_dir():
                if relative not in PUBLIC_DIRS:
                    raise ValueError(f'Unexpected public directory: {relative}')
            elif path.is_file() and relative in PUBLIC_FILES:
                present.add(relative)
            else:
                raise ValueError(f'Unexpected public asset: {relative}')
    if complete and present != PUBLIC_FILES:
        raise ValueError(f'Missing synthetic assets: {sorted(PUBLIC_FILES - present)}')


def check_generated_data() -> None:
    check_public_tree(complete=True)
    metadata = json.loads((DATA / 'demo_data_metadata.json').read_text(encoding='utf-8'))
    if metadata.get('fixture_kind') != 'synthetic_not_research_data':
        raise ValueError('Synthetic metadata marker is missing')
    expected = DATA_FILES - {'demo_data_metadata.json'}
    if set(metadata.get('public_artifacts', {})) != expected:
        raise ValueError('Metadata artifact list is not the expected synthetic set')
    for name in expected:
        raw = (DATA / name).read_bytes()
        record = metadata['public_artifacts'][name]
        if record != {'path': f'public/data/{name}',
                      'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}:
            raise ValueError(f'Synthetic data hash mismatch: {name}')

LABELS = {'synthetic_alpha': 'Synthetic collection A', 'synthetic_beta': 'Synthetic collection B'}
INSTRUMENTS = {'synthetic_alpha': 'Demo imager A', 'synthetic_beta': 'Demo imager B'}
COLORS = {'synthetic_alpha': '#2563eb', 'synthetic_beta': '#16a34a'}
FIELDS = ['entry_id','dataset_id','dataset_label','instrument','license','license_status','license_url','source_url','doi','label','original_label','image_count','selected_aphia_ids','selected_aphia_image_counts','selected_aphia_source','valid_image_count','invalid_image_count','terminal_worms_names','terminal_ranks','lineage_notes','risk_flags','special_tags','contaminated_sources','validation_statuses','invalid_statuses','worms_aphia_ids','dwca_aphia_ids','dwca_usable_aphia_ids','dwca_review_aphia_ids','dwca_review_reasons','worms_record_urls','synonym_note','accepted_name','accepted_aphia_id','status_review_flag','status_review_rollup_aphia_id','status_review_rollup_name','status_review_rollup_rank','status_review_external_action','status_review_external_evidence_json','status_review_evidence_json','broad_class','broad_class_original_label','broad_class_aphia_id','broad_class_source_file','broad_class_reason','source_example']


def write_json(name: str, obj: object) -> None:
    (DATA/name).write_text(json.dumps(obj, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')


def sample(dataset: str, label: str, key: str, invalid: bool = False) -> dict[str, str]:
    folder = 'invalid-samples' if invalid else 'samples'
    (PUBLIC/folder).mkdir(parents=True, exist_ok=True)
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><rect width="240" height="180" fill="#eef2ff"/><ellipse cx="120" cy="78" rx="56" ry="34" fill="none" stroke="#2563eb" stroke-width="4"/><circle cx="105" cy="72" r="9" fill="#93c5fd"/><circle cx="137" cy="86" r="6" fill="#60a5fa"/><text x="120" y="150" text-anchor="middle" font-family="sans-serif" font-size="14">SYNTHETIC DIAGRAM</text></svg>\n'
    (PUBLIC/folder/f'{key}.svg').write_text(svg, encoding='utf-8')
    return {'dataset_id':dataset,'label':label,'image_id':key,'thumbnail_url':f'/{folder}/{key}.svg','source_ref':f'synthetic/{key}.svg','width':'240','height':'180'}


def generate() -> None:
    check_public_tree(complete=False)
    DATA.mkdir(parents=True, exist_ok=True)
    candidates = []
    configs = [('synthetic_alpha','Rounded form','demo_taxon_a',12,'','juvenile'),('synthetic_beta','Rounded form','demo_taxon_a',8,'contaminated',''),('synthetic_alpha','Elongated form','demo_taxon_b',6,'broad_class','')]
    names = {'demo_taxon_a':'Fictional rounded group','demo_taxon_b':'Fictional elongated group'}
    samples = {}
    for index,(dataset,label,tid,count,risk,tag) in enumerate(configs,1):
        entry = f'{dataset}::{label}'
        row = dict.fromkeys(FIELDS,'')
        row.update(entry_id=entry,dataset_id=dataset,dataset_label=LABELS[dataset],instrument=INSTRUMENTS[dataset],license='Not a research dataset',license_status='synthetic',label=label,original_label=label,image_count=str(count),selected_aphia_ids=tid,selected_aphia_image_counts=str(count),selected_aphia_source='synthetic_example_not_WoRMS',valid_image_count=str(count),invalid_image_count=str(count if risk=='contaminated' else 0),terminal_worms_names=names[tid],terminal_ranks='Class',lineage_notes='Invented UI fixture; not a biological assertion',risk_flags=risk,special_tags=tag,contaminated_sources='Synthetic mismatch evidence' if risk=='contaminated' else '',validation_statuses='Synthetic fixture',source_example=f'synthetic/collection-{index}.csv')
        if risk=='broad_class':row.update(broad_class=names[tid],broad_class_original_label=label,broad_class_aphia_id=tid,broad_class_source_file='synthetic/review.csv',broad_class_reason='Demonstration only')
        candidates.append(row)
        samples[entry]=[sample(dataset,label,f'valid-{index}')]
    with (DATA/'valid_class_candidates.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerows(candidates)
    children=[]
    for tid,name in names.items():
        rows=[r for r in candidates if r['selected_aphia_ids']==tid]
        leaves=[{'type':'dataset_class','name':r['label'],'entry_id':r['entry_id'],'placement_id':r['entry_id']+'::'+tid,'dataset_id':r['dataset_id'],'dataset_label':r['dataset_label'],'instrument':r['instrument'],'original_label':r['label'],'selected_aphia_id':tid,'selected_aphia_source':'synthetic_example_not_WoRMS','rank':'Class','image_count':int(r['image_count']),'entry_count':1,'risk_flags':r['risk_flags'].split('|') if r['risk_flags'] else [],'special_tags':r['special_tags'].split('|') if r['special_tags'] else [],'lineage_notes':[],'children':[]} for r in rows]
        children.append({'type':'taxon','name':name,'rank':'Class','aphia_id':tid,'image_count':sum(x['image_count'] for x in leaves),'entry_count':len(leaves),'datasets':list(dict.fromkeys(r['dataset_id'] for r in rows)),'risk_flags':list(dict.fromkeys(flag for x in leaves for flag in x['risk_flags'])),'children':leaves})
    tree={'type':'root','name':'Synthetic taxonomy','image_count':26,'entry_count':3,'dataset_class_entry_count':3,'unique_selected_aphia_id_count':2,'unique_candidate_image_count':26,'placement_weighted_image_count':26,'dataset_colors':COLORS,'dataset_labels':LABELS,'dataset_instruments':INSTRUMENTS,'children':children}
    write_json('taxonomy_tree.json',tree);write_json('class_image_samples.json',samples)
    write_json('worms_lineages.json',{tid:{'synthetic':True,'nodes':[{'aphia_id':tid,'name':name,'rank':'Class'}]} for tid,name in names.items()})
    groups=[];invalid_samples={}
    for index,(dataset,label,status,pseudo,count,overlap) in enumerate([('synthetic_alpha','Synthetic debris','Non-Taxonomic Category','ntc_001',4,False),('synthetic_beta','Rounded form','Taxonomic Mismatch','tm_001',8,True)],1):
        key=f'synthetic-invalid-{index}'
        evidence={'dataset_id':dataset,'instrument':INSTRUMENTS[dataset],'license':'Not a research dataset','license_status':'synthetic','aliases':[label],'image_count':count,'reasons':['Invented review example'],'source_examples':[f'synthetic/review-{index}.csv'],'worms_sources':[],'valid_tree_entry':'yes' if overlap else 'no','invalid_reason_count':1,'valid_image_count':count if overlap else 0,'invalid_image_count':count}
        groups.append({'group_key':key,'pseudo_aphia_id':pseudo,'sample_key':key,'aliases':[label],'status':status,'dataset_ids':[dataset],'total_image_count':count,'include_valid_tree_overlap':overlap,'invalid_reason_count':1,'valid_image_count':count if overlap else 0,'invalid_image_count':count,'datasets':[evidence]})
        invalid_samples[key]=[sample(dataset,label,f'invalid-{index}',True)]
    invalid={'tables':{'non_taxonomic_category':[groups[0]],'taxonomic_mismatch':[groups[1]]},'samples':invalid_samples,'summary':{'source':'synthetic fixtures only','sample_limit_per_dataset':8,'excluded_valid_tree_overlap_default':False,'table_counts':{'non_taxonomic_category':1,'taxonomic_mismatch':1},'table_image_counts':{'non_taxonomic_category':4,'taxonomic_mismatch':8},'evidence_table_total_group_count':2,'evidence_table_total_image_count':12,'unique_group_count':2,'total_image_count':12,'total_image_count_semantics':'unique_dataset_invalid_group_image_union'}}
    write_json('invalid_label_groups.json',invalid)
    targets=[{'source_id':tid,'source_alias':alias,'image_count':count,'valid_statuses':status,'invalid_reasons':'','risk_flags':'','special_tags':'','dataset_ids':'synthetic_alpha|synthetic_beta','source_labels':alias} for tid,alias,count,status in [('demo_taxon_a',names['demo_taxon_a'],20,'valid'),('demo_taxon_b',names['demo_taxon_b'],6,'valid'),('ntc_001','Synthetic debris',4,'invalid')]]
    histories=[]
    for index in (1,2):
        rows=[]
        for target in targets:
            action='keep' if index==1 or target['source_id']=='demo_taxon_a' else ('merge' if target['source_id']=='demo_taxon_b' else 'drop')
            rows.append({'action':action,'source_id':target['source_id'],'target_id':'demo_taxon_a' if action=='merge' else '','source_alias':target['source_alias'],'target_alias':names['demo_taxon_a'] if action=='merge' else '','notes':'Synthetic demonstration, not a biological mapping','validation_status':'ok','validation_message':''})
        histories.append({'history_id':f'synthetic-review-{index}','file_name':f'synthetic-review-{index}.csv','path':f'synthetic/history/review-{index}.csv','row_count':3,'explicit_row_count':sum(r['action']!='keep' for r in rows),'merge_count':sum(r['action']=='merge' for r in rows),'drop_count':sum(r['action']=='drop' for r in rows),'warning_count':0,'warnings':[],'rows':rows})
    write_json('mapping_status.json',{'generated_at_utc':'2026-11-14T00:00:00Z','source_targets':'synthetic targets','history_dir':'synthetic/history','export_fields':['action','source_id','target_id','source_alias','target_alias','notes'],'target_count':len(targets),'targets':targets,'latest_history_id':histories[-1]['history_id'],'histories':histories})
    artifacts={p.name:{'path':f'public/data/{p.name}','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in (DATA / name for name in sorted(DATA_FILES - {'demo_data_metadata.json'}))}
    write_json('demo_data_metadata.json',{'fixture_kind':'synthetic_not_research_data','generator':'scripts/generate_synthetic_demo.py','public_artifacts':artifacts,'notes':'Every ID, label, count, review rule and diagram is invented for this candidate. No original public/data file was copied.'})

    check_generated_data()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate without writing files')
    args = parser.parse_args()
    if args.check:
        check_generated_data()
    else:
        generate()


if __name__ == '__main__':
    main()

