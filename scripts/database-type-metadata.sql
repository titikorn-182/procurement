-- Read-only public-schema metadata. No application rows, function bodies or secrets.
select jsonb_build_object(
  'columns', (select jsonb_agg(to_jsonb(c) order by c.table_name,c.ordinal_position)
    from (select table_name,column_name,udt_name,is_nullable,column_default,
      is_generated,is_identity,identity_generation,ordinal_position
      from information_schema.columns where table_schema='public') c),
  'relations', (select jsonb_agg(to_jsonb(r) order by r.table_name,r.constraint_name)
    from (select c.relname as table_name,k.conname as constraint_name,
      array(select a.attname from unnest(k.conkey) with ordinality u(n,i)
        join pg_attribute a on a.attrelid=k.conrelid and a.attnum=u.n order by u.i) as columns,
      f.relname as referenced_table,fn.nspname as referenced_schema,
      array(select a.attname from unnest(k.confkey) with ordinality u(n,i)
        join pg_attribute a on a.attrelid=k.confrelid and a.attnum=u.n order by u.i) as referenced_columns,
      exists(select 1 from pg_constraint uk where uk.conrelid=k.conrelid
        and uk.contype in ('p','u') and uk.conkey @> k.conkey and uk.conkey <@ k.conkey) as one_to_one
      from pg_constraint k join pg_class c on c.oid=k.conrelid
      join pg_namespace n on n.oid=c.relnamespace join pg_class f on f.oid=k.confrelid
      join pg_namespace fn on fn.oid=f.relnamespace
      where n.nspname='public' and k.contype='f') r),
  'enums', (select jsonb_object_agg(name,labels) from
    (select t.typname as name,jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t join pg_enum e on e.enumtypid=t.oid
      join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' group by t.typname) e),
  'functions', (select jsonb_agg(to_jsonb(f) order by f.name) from
    (select p.proname as name,p.proargnames as names,p.proargmodes as modes,
      array(select t.typname from unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) with ordinality u(id,i)
        join pg_type t on t.oid=u.id order by u.i) as types,
      p.pronargdefaults as defaults,p.pronargs as input_count,t.typname as return_type,p.proretset as returns_set
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      join pg_type t on t.oid=p.prorettype
      where n.nspname='public' and p.prokind='f' and t.typname<>'trigger') f)
) as schema_metadata;
