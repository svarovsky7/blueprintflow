--
-- PostgreSQL database dump
--

\restrict HQiOWqNHjnJwLnt3llPuvZQLKVTMweqVsgRq6cc4yEgjfqYrllMKg4kYO6QWwOz

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: estimate_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estimate_type AS ENUM (
    'chessboard',
    'vor'
);


ALTER TYPE public.estimate_type OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: fill_storage_mappings(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fill_storage_mappings() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  select 'projects', id::text, transliterate(name)
  from projects
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();

  insert into storage_mappings(table_name, entity_id, slug)
  select 'documentation_tags', id::text, transliterate(name)
  from documentation_tags
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();

  insert into storage_mappings(table_name, entity_id, slug)
  select 'documentation_versions', v.id::text, transliterate(d.code) || '_ver' || v.version_number
  from documentation_versions v
  join documentations d on d.id = v.documentation_id
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
end;
$$;


ALTER FUNCTION public.fill_storage_mappings() OWNER TO postgres;

--
-- Name: set_block_floor_range(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Удаляем существующие связи для данного корпуса
  DELETE FROM block_floor_mapping WHERE block_id = p_block_id;
  
  -- Вставляем новые связи для всего диапазона этажей
  INSERT INTO block_floor_mapping (block_id, floor_number)
  SELECT p_block_id, floor_number
  FROM floors
  WHERE floor_number >= LEAST(p_from_floor, p_to_floor) 
    AND floor_number <= GREATEST(p_from_floor, p_to_floor);
END;
$$;


ALTER FUNCTION public.set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer) OWNER TO postgres;

--
-- Name: transliterate(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.transliterate(input text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  result text := '';
  ch text;
  mapped text;
begin
  for ch in select unnest(regexp_split_to_array(input, '')) loop
    case lower(ch)
      when 'а' then mapped := 'a';
      when 'б' then mapped := 'b';
      when 'в' then mapped := 'v';
      when 'г' then mapped := 'g';
      when 'д' then mapped := 'd';
      when 'е' then mapped := 'e';
      when 'ё' then mapped := 'e';
      when 'ж' then mapped := 'zh';
      when 'з' then mapped := 'z';
      when 'и' then mapped := 'i';
      when 'й' then mapped := 'j';
      when 'к' then mapped := 'k';
      when 'л' then mapped := 'l';
      when 'м' then mapped := 'm';
      when 'н' then mapped := 'n';
      when 'о' then mapped := 'o';
      when 'п' then mapped := 'p';
      when 'р' then mapped := 'r';
      when 'с' then mapped := 's';
      when 'т' then mapped := 't';
      when 'у' then mapped := 'u';
      when 'ф' then mapped := 'f';
      when 'х' then mapped := 'h';
      when 'ц' then mapped := 'c';
      when 'ч' then mapped := 'ch';
      when 'ш' then mapped := 'sh';
      when 'щ' then mapped := 'sch';
      when 'ь' then mapped := '';
      when 'ы' then mapped := 'y';
      when 'ъ' then mapped := '';
      when 'э' then mapped := 'e';
      when 'ю' then mapped := 'yu';
      when 'я' then mapped := 'ya';
      else mapped := lower(ch);
    end case;
    if ch ~ '[A-Z]' then
      result := result || upper(left(mapped,1)) || substring(mapped from 2);
    else
      result := result || mapped;
    end if;
  end loop;
  return regexp_replace(result, '[^a-zA-Z0-9]', '_', 'g');
end;
$$;


ALTER FUNCTION public.transliterate(input text) OWNER TO postgres;

--
-- Name: trg_storage_doc_tags(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_storage_doc_tags() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  values ('documentation_tags', new.id::text, transliterate(new.name))
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.trg_storage_doc_tags() OWNER TO postgres;

--
-- Name: trg_storage_doc_versions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_storage_doc_versions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  doc_code text;
begin
  select code into doc_code from documentations where id = new.documentation_id;
  insert into storage_mappings(table_name, entity_id, slug)
  values (
    'documentation_versions',
    new.id::text,
    transliterate(doc_code) || '_ver' || new.version_number
  )
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.trg_storage_doc_versions() OWNER TO postgres;

--
-- Name: trg_storage_projects(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_storage_projects() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into storage_mappings(table_name, entity_id, slug)
  values ('projects', new.id::text, transliterate(new.name))
  on conflict (table_name, entity_id) do update
    set slug = excluded.slug,
        updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.trg_storage_projects() OWNER TO postgres;

--
-- Name: update_rates_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_rates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.update_rates_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: block_floor_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_floor_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    block_id uuid NOT NULL,
    floor_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.block_floor_mapping OWNER TO postgres;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.blocks OWNER TO postgres;

--
-- Name: chessboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chessboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    material text,
    "quantityPd" numeric,
    "quantitySpec" numeric,
    "quantityRd" numeric,
    unit_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cost_category_code text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color text
);


ALTER TABLE public.chessboard OWNER TO postgres;

--
-- Name: chessboard_documentation_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chessboard_documentation_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chessboard_id uuid NOT NULL,
    documentation_id uuid NOT NULL
);


ALTER TABLE public.chessboard_documentation_mapping OWNER TO postgres;

--
-- Name: TABLE chessboard_documentation_mapping; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chessboard_documentation_mapping IS 'Связь записей шахматки с шифрами проектов (документацией)';


--
-- Name: COLUMN chessboard_documentation_mapping.chessboard_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_documentation_mapping.chessboard_id IS 'ID записи в шахматке';


--
-- Name: COLUMN chessboard_documentation_mapping.documentation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_documentation_mapping.documentation_id IS 'ID документации (шифра проекта)';


--
-- Name: chessboard_floor_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chessboard_floor_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chessboard_id uuid NOT NULL,
    floor_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chessboard_floor_mapping OWNER TO postgres;

--
-- Name: TABLE chessboard_floor_mapping; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chessboard_floor_mapping IS 'Связь записей шахматки с этажами';


--
-- Name: COLUMN chessboard_floor_mapping.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_floor_mapping.id IS 'Уникальный идентификатор записи';


--
-- Name: COLUMN chessboard_floor_mapping.chessboard_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_floor_mapping.chessboard_id IS 'ID записи из таблицы chessboard';


--
-- Name: COLUMN chessboard_floor_mapping.floor_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_floor_mapping.floor_number IS 'Номер этажа из таблицы floors';


--
-- Name: COLUMN chessboard_floor_mapping.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_floor_mapping.created_at IS 'Дата и время создания записи';


--
-- Name: COLUMN chessboard_floor_mapping.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chessboard_floor_mapping.updated_at IS 'Дата и время последнего обновления';


--
-- Name: chessboard_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chessboard_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chessboard_id uuid,
    cost_category_id integer NOT NULL,
    cost_type_id integer,
    location_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    block_id uuid
);


ALTER TABLE public.chessboard_mapping OWNER TO postgres;

--
-- Name: chessboard_rates_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chessboard_rates_mapping (
    chessboard_id uuid NOT NULL,
    rate_id uuid NOT NULL
);


ALTER TABLE public.chessboard_rates_mapping OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    comment_text text NOT NULL,
    author_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: TABLE comments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.comments IS 'Комментарии (UUID)';


--
-- Name: COLUMN comments.comment_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.comments.comment_text IS 'Текст комментария';


--
-- Name: COLUMN comments.author_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.comments.author_id IS 'ID автора комментария';


--
-- Name: COLUMN comments.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.comments.id IS 'UUID комментария';


--
-- Name: cost_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cost_categories (
    name text NOT NULL,
    description text,
    id integer NOT NULL,
    unit_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    number integer
);


ALTER TABLE public.cost_categories OWNER TO postgres;

--
-- Name: COLUMN cost_categories.number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cost_categories.number IS 'number position';


--
-- Name: cost_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cost_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cost_categories_id_seq OWNER TO postgres;

--
-- Name: cost_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cost_categories_id_seq OWNED BY public.cost_categories.id;


--
-- Name: detail_cost_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detail_cost_categories (
    id integer NOT NULL,
    name text NOT NULL,
    unit_id uuid,
    description text,
    cost_category_id bigint NOT NULL,
    location_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.detail_cost_categories OWNER TO postgres;

--
-- Name: detail_cost_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detail_cost_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detail_cost_categories_id_seq OWNER TO postgres;

--
-- Name: detail_cost_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detail_cost_categories_id_seq OWNED BY public.detail_cost_categories.id;


--
-- Name: disk_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disk_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    base_path text NOT NULL,
    make_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.disk_settings OWNER TO postgres;

--
-- Name: documentation_file_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentation_file_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid,
    file_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.documentation_file_paths OWNER TO postgres;

--
-- Name: documentation_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentation_tags (
    id integer NOT NULL,
    tag_number integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.documentation_tags OWNER TO postgres;

--
-- Name: TABLE documentation_tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documentation_tags IS 'Справочник тэгов документации';


--
-- Name: COLUMN documentation_tags.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_tags.id IS 'Уникальный идентификатор записи';


--
-- Name: COLUMN documentation_tags.tag_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_tags.tag_number IS 'Номер тэга';


--
-- Name: COLUMN documentation_tags.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_tags.name IS 'Название тэга';


--
-- Name: COLUMN documentation_tags.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_tags.created_at IS 'Дата и время создания записи';


--
-- Name: COLUMN documentation_tags.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_tags.updated_at IS 'Дата и время последнего обновления записи';


--
-- Name: documentation_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documentation_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documentation_tags_id_seq OWNER TO postgres;

--
-- Name: documentation_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documentation_tags_id_seq OWNED BY public.documentation_tags.id;


--
-- Name: documentation_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentation_versions (
    version_number integer NOT NULL,
    issue_date date,
    file_url text,
    status character varying(50) DEFAULT 'not_filled'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    documentation_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_files jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT documentation_versions_status_check CHECK (((status)::text = ANY ((ARRAY['filled_recalc'::character varying, 'filled_spec'::character varying, 'not_filled'::character varying, 'vor_created'::character varying])::text[]))),
    CONSTRAINT local_files_is_array CHECK ((jsonb_typeof(local_files) = 'array'::text))
);


ALTER TABLE public.documentation_versions OWNER TO postgres;

--
-- Name: TABLE documentation_versions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documentation_versions IS 'Версии документации (UUID)';


--
-- Name: COLUMN documentation_versions.version_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.version_number IS 'Номер версии';


--
-- Name: COLUMN documentation_versions.issue_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.issue_date IS 'Дата выдачи версии';


--
-- Name: COLUMN documentation_versions.file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.file_url IS 'Ссылка на файл документации';


--
-- Name: COLUMN documentation_versions.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.status IS 'Статус заполнения данных';


--
-- Name: COLUMN documentation_versions.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.id IS 'UUID версии документации';


--
-- Name: COLUMN documentation_versions.local_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentation_versions.local_files IS 'Локальные файлы версии документации в формате JSON';


--
-- Name: documentations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentations (
    code character varying(255) NOT NULL,
    tag_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage character varying(1) DEFAULT 'П'::character varying,
    CONSTRAINT documentations_stage_check CHECK (((stage)::text = ANY ((ARRAY['П'::character varying, 'Р'::character varying])::text[])))
);


ALTER TABLE public.documentations OWNER TO postgres;

--
-- Name: TABLE documentations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documentations IS 'Справочник документации (UUID)';


--
-- Name: COLUMN documentations.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations.code IS 'Шифр проекта';


--
-- Name: COLUMN documentations.tag_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations.tag_id IS 'ID раздела/тэга документации';


--
-- Name: COLUMN documentations.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations.id IS 'UUID документации';


--
-- Name: COLUMN documentations.stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations.stage IS 'Стадия проектирования (П - проект, Р - рабочка)';


--
-- Name: documentations_projects_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentations_projects_mapping (
    documentation_id uuid NOT NULL,
    project_id uuid NOT NULL,
    block_id uuid
);


ALTER TABLE public.documentations_projects_mapping OWNER TO postgres;

--
-- Name: TABLE documentations_projects_mapping; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documentations_projects_mapping IS 'Таблица маппинга документации с проектами и корпусами';


--
-- Name: COLUMN documentations_projects_mapping.documentation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations_projects_mapping.documentation_id IS 'UUID документации';


--
-- Name: COLUMN documentations_projects_mapping.project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations_projects_mapping.project_id IS 'UUID проекта';


--
-- Name: COLUMN documentations_projects_mapping.block_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documentations_projects_mapping.block_id IS 'UUID корпуса (необязательно)';


--
-- Name: entity_comments_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_comments_mapping (
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    comment_id uuid NOT NULL
);


ALTER TABLE public.entity_comments_mapping OWNER TO postgres;

--
-- Name: TABLE entity_comments_mapping; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entity_comments_mapping IS 'Универсальная связь комментариев с сущностями (таблица маппинга)';


--
-- Name: COLUMN entity_comments_mapping.entity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_comments_mapping.entity_type IS 'Тип сущности';


--
-- Name: COLUMN entity_comments_mapping.entity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_comments_mapping.entity_id IS 'UUID сущности';


--
-- Name: COLUMN entity_comments_mapping.comment_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_comments_mapping.comment_id IS 'UUID комментария';


--
-- Name: estimate_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estimate_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid,
    description text,
    quantity numeric,
    unit_price numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.estimate_items OWNER TO postgres;

--
-- Name: estimates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    type public.estimate_type NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.estimates OWNER TO postgres;

--
-- Name: floors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.floors (
    number integer NOT NULL
);


ALTER TABLE public.floors OWNER TO postgres;

--
-- Name: location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.location OWNER TO postgres;

--
-- Name: location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_id_seq OWNER TO postgres;

--
-- Name: location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_id_seq OWNED BY public.location.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects_blocks (
    project_id uuid NOT NULL,
    block_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.projects_blocks OWNER TO postgres;

--
-- Name: rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_name text NOT NULL,
    work_set text,
    base_rate numeric NOT NULL,
    unit_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rates OWNER TO postgres;

--
-- Name: rates_detail_cost_categories_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rates_detail_cost_categories_mapping (
    rate_id uuid NOT NULL,
    detail_cost_category_id integer NOT NULL
);


ALTER TABLE public.rates_detail_cost_categories_mapping OWNER TO postgres;

--
-- Name: reference_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reference_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reference_data OWNER TO postgres;

--
-- Name: statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applicable_pages jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.statuses OWNER TO postgres;

--
-- Name: TABLE statuses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.statuses IS 'Справочник статусов документации';


--
-- Name: COLUMN statuses.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.statuses.id IS 'UUID статуса';


--
-- Name: COLUMN statuses.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.statuses.name IS 'Название статуса';


--
-- Name: COLUMN statuses.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.statuses.color IS 'Цвет для визуализации';


--
-- Name: COLUMN statuses.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.statuses.is_active IS 'Активен ли статус';


--
-- Name: COLUMN statuses.applicable_pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.statuses.applicable_pages IS 'Array of page keys where this status is applicable';


--
-- Name: storage_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_mappings (
    table_name text NOT NULL,
    entity_id text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.storage_mappings OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: v_block_floor_range; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_block_floor_range AS
 SELECT block_id,
    min(floor_number) AS bottom_floor,
    max(floor_number) AS top_floor,
    count(*) AS total_floors
   FROM public.block_floor_mapping
  GROUP BY block_id;


ALTER VIEW public.v_block_floor_range OWNER TO postgres;

--
-- Name: work_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    description text,
    quantity numeric,
    unit_id uuid,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.work_progress OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: cost_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_categories ALTER COLUMN id SET DEFAULT nextval('public.cost_categories_id_seq'::regclass);


--
-- Name: detail_cost_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_cost_categories ALTER COLUMN id SET DEFAULT nextval('public.detail_cost_categories_id_seq'::regclass);


--
-- Name: documentation_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_tags ALTER COLUMN id SET DEFAULT nextval('public.documentation_tags_id_seq'::regclass);


--
-- Name: location id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location ALTER COLUMN id SET DEFAULT nextval('public.location_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: block_floor_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.block_floor_mapping (id, block_id, floor_number, created_at, updated_at) FROM stdin;
3fc945c8-a942-4a1d-8bc3-ba093802f5f3	c16b4784-73f0-4f1b-9401-a964d0a81aa0	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6ac3353b-4ec3-4180-ab41-4bb22a65b448	c16b4784-73f0-4f1b-9401-a964d0a81aa0	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b9387d28-0802-420a-b182-218245a44251	c16b4784-73f0-4f1b-9401-a964d0a81aa0	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3bb7f72f-f957-4682-982d-3ffd4b671666	c16b4784-73f0-4f1b-9401-a964d0a81aa0	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4b8a82d2-f7cc-43d4-b14f-44621e008244	c16b4784-73f0-4f1b-9401-a964d0a81aa0	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e0008de1-0349-4eba-b874-59e22bf5131b	c16b4784-73f0-4f1b-9401-a964d0a81aa0	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9ca5e8df-6f55-486a-8abb-6f069adfabb3	c16b4784-73f0-4f1b-9401-a964d0a81aa0	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e5507980-9386-4545-9d03-107cd38df070	c16b4784-73f0-4f1b-9401-a964d0a81aa0	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d1a3f574-c700-490c-a77a-dfc0dabf3539	c16b4784-73f0-4f1b-9401-a964d0a81aa0	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
898a5504-cc17-4b6c-a392-233ab77fefda	c16b4784-73f0-4f1b-9401-a964d0a81aa0	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
09a0205d-f912-4507-8d30-ed0866277626	c16b4784-73f0-4f1b-9401-a964d0a81aa0	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
15786c09-b5a7-4007-a64d-169c007976ea	c16b4784-73f0-4f1b-9401-a964d0a81aa0	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
52f4d58d-5433-49f1-8f19-84dab13cbaaa	c16b4784-73f0-4f1b-9401-a964d0a81aa0	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
8133da97-f4a7-41da-91e2-d02b870976c9	c16b4784-73f0-4f1b-9401-a964d0a81aa0	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b8ece2db-deab-4d7d-b3cc-42601d22a3c4	c16b4784-73f0-4f1b-9401-a964d0a81aa0	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1c08769f-3508-4d72-b8d5-5136bd879ce9	c16b4784-73f0-4f1b-9401-a964d0a81aa0	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
80c71779-e6ad-4388-9085-bc0b5e922cad	c16b4784-73f0-4f1b-9401-a964d0a81aa0	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
59ad14cd-6f82-407d-a48f-8ae671c64db9	c16b4784-73f0-4f1b-9401-a964d0a81aa0	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ff09663e-5a1b-43ab-9c86-fdecb5682016	c16b4784-73f0-4f1b-9401-a964d0a81aa0	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d0af06c4-e14b-4fa6-a9a5-8f1bd53b02ed	c16b4784-73f0-4f1b-9401-a964d0a81aa0	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4468cbd4-d718-41d0-a715-db7c5c83b98d	c16b4784-73f0-4f1b-9401-a964d0a81aa0	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d3c7432b-cae7-4a0a-82ee-233d9cfc78c3	c16b4784-73f0-4f1b-9401-a964d0a81aa0	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
74ea5f62-aad7-4ace-8ec8-890ff3f4a632	c16b4784-73f0-4f1b-9401-a964d0a81aa0	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
64c7f2ec-a44e-4fcc-a8d8-31d77be15a73	c16b4784-73f0-4f1b-9401-a964d0a81aa0	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c0faea4b-2257-4258-b992-75f08182d2d9	c16b4784-73f0-4f1b-9401-a964d0a81aa0	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3172e14a-cd5b-4849-8784-2e15cee1cb7d	c16b4784-73f0-4f1b-9401-a964d0a81aa0	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2baef54b-e30f-4c54-9c7e-9e09bdc2a57e	c16b4784-73f0-4f1b-9401-a964d0a81aa0	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4c06d006-6093-4aa7-9bd9-6ccfa7c34f22	c16b4784-73f0-4f1b-9401-a964d0a81aa0	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
16854407-9e4e-4d27-9c0e-61d5ee822d7a	c16b4784-73f0-4f1b-9401-a964d0a81aa0	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cbf6fea0-390c-42da-825d-216e4d881b57	c16b4784-73f0-4f1b-9401-a964d0a81aa0	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4668b647-601f-4db2-8685-28658f7a8592	c16b4784-73f0-4f1b-9401-a964d0a81aa0	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
89cc816e-8e95-4919-847c-ec83133c0e56	c16b4784-73f0-4f1b-9401-a964d0a81aa0	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7a0a1193-47da-43a9-8367-6bf7b78791d3	c16b4784-73f0-4f1b-9401-a964d0a81aa0	31	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3c78cb9b-6d6b-46c4-8d67-53ffc19b3953	c16b4784-73f0-4f1b-9401-a964d0a81aa0	32	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d2d014ca-c2d4-4736-ad1d-23d628c8381e	c16b4784-73f0-4f1b-9401-a964d0a81aa0	33	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
41a94e98-61a0-49a1-8f8e-78cbfa9a7d0d	c16b4784-73f0-4f1b-9401-a964d0a81aa0	34	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2e2ee7b6-0b45-4c33-b0e1-767a151b5301	c16b4784-73f0-4f1b-9401-a964d0a81aa0	35	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
33351868-b3ed-449d-9f43-9c8f3532dd75	c16b4784-73f0-4f1b-9401-a964d0a81aa0	36	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
807f59a7-e67f-490c-a127-527c23d5e1ff	c16b4784-73f0-4f1b-9401-a964d0a81aa0	37	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f5f46d2b-5982-421c-8b86-b0d0bbc04dc8	c16b4784-73f0-4f1b-9401-a964d0a81aa0	38	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2197e601-8940-44cc-8189-4ef83ed28d10	c16b4784-73f0-4f1b-9401-a964d0a81aa0	39	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
541dec81-4c9d-46bb-b0d4-e8f0088a6dc6	c16b4784-73f0-4f1b-9401-a964d0a81aa0	40	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
97b641f7-07bd-47d3-803b-6ddf16b3f683	c16b4784-73f0-4f1b-9401-a964d0a81aa0	41	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
af801e26-70ea-4dd1-905b-417cc3ca7d69	c16b4784-73f0-4f1b-9401-a964d0a81aa0	42	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d9b7ab61-f7ab-4e6e-b41a-784fd322002a	c16b4784-73f0-4f1b-9401-a964d0a81aa0	43	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
42a63f06-6d60-4f40-8637-81474e133a73	c16b4784-73f0-4f1b-9401-a964d0a81aa0	44	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
254c5d81-87cf-4e42-93e6-ed2da429905f	c16b4784-73f0-4f1b-9401-a964d0a81aa0	45	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
90257547-68cd-4514-8ad3-a08e9e896fbb	c16b4784-73f0-4f1b-9401-a964d0a81aa0	46	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e40a2661-ec5d-44f9-a3b3-7fd039aeb723	c16b4784-73f0-4f1b-9401-a964d0a81aa0	47	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6b4ae810-3350-41cf-a233-41a4678f7fd9	c16b4784-73f0-4f1b-9401-a964d0a81aa0	48	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
44d96704-a320-4fa1-b6e6-9ad12ad985cc	c16b4784-73f0-4f1b-9401-a964d0a81aa0	49	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c2ba572c-9ade-45da-a85d-26ea667dcf79	c16b4784-73f0-4f1b-9401-a964d0a81aa0	50	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ee7631f1-649a-4db0-b7d3-2bdf62ce7860	b5837d17-e31c-4cf0-b45e-6c47343aaa13	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
8cf3b1fd-165a-44c6-945a-79e0597aa319	b5837d17-e31c-4cf0-b45e-6c47343aaa13	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
046ac502-56de-4f65-bcf3-d533b8e86b83	b5837d17-e31c-4cf0-b45e-6c47343aaa13	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6f7fc4c9-cd48-4667-836a-c67400b9c360	b5837d17-e31c-4cf0-b45e-6c47343aaa13	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a02b5f6e-5fc7-4815-afdc-04d36e740ad2	b5837d17-e31c-4cf0-b45e-6c47343aaa13	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d6be7bb5-7769-4bfc-b658-cc3ce0fb6c1e	b5837d17-e31c-4cf0-b45e-6c47343aaa13	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d3eed368-7c3e-4adb-bee2-da4167d01e56	b5837d17-e31c-4cf0-b45e-6c47343aaa13	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
431c7777-e965-41bc-b2a4-af04116fbd37	b5837d17-e31c-4cf0-b45e-6c47343aaa13	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
854e8fc1-337c-4e3c-be5b-dd6456bd29eb	b5837d17-e31c-4cf0-b45e-6c47343aaa13	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
02d12cfa-4ef9-45cf-ba5f-0566f0c7d41a	b5837d17-e31c-4cf0-b45e-6c47343aaa13	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ee9790a3-ae0b-4073-ace8-051fb76a6521	b5837d17-e31c-4cf0-b45e-6c47343aaa13	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
93781d38-bb46-4d59-a0e8-70cbf98a0473	b5837d17-e31c-4cf0-b45e-6c47343aaa13	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2d951fea-cf2a-4517-a9fc-e0a9f32a5db3	b5837d17-e31c-4cf0-b45e-6c47343aaa13	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cff91fc9-0120-45c7-b0ba-1c1b02d397e5	b5837d17-e31c-4cf0-b45e-6c47343aaa13	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f0cb7b99-f9f3-4ae8-be50-9c693d89a1da	b5837d17-e31c-4cf0-b45e-6c47343aaa13	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
22d70ff0-a38a-4ba1-9f60-6c872efd4954	b5837d17-e31c-4cf0-b45e-6c47343aaa13	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a59d7970-796c-4771-ad77-3289188a2bc0	b5837d17-e31c-4cf0-b45e-6c47343aaa13	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
360878cf-9ec5-4f38-8f18-6d071bd1327f	b5837d17-e31c-4cf0-b45e-6c47343aaa13	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a0c3fdc6-94a1-4bcf-8efb-136c9caafecd	b5837d17-e31c-4cf0-b45e-6c47343aaa13	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
37b98292-12cc-4189-aa67-4c53b6254fe1	b5837d17-e31c-4cf0-b45e-6c47343aaa13	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
bc46f98f-6fc7-4784-b78b-5aa379a9e464	b5837d17-e31c-4cf0-b45e-6c47343aaa13	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7c238827-69c4-4a35-8c2f-758cf0695bb0	b5837d17-e31c-4cf0-b45e-6c47343aaa13	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ab1a6847-d71b-44b0-9ae7-751d77b7b543	b5837d17-e31c-4cf0-b45e-6c47343aaa13	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6c34b3c6-881c-449b-a287-bea9c39401fb	b5837d17-e31c-4cf0-b45e-6c47343aaa13	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7d8caea8-1f15-4e90-97e2-6d8cb8a63376	b5837d17-e31c-4cf0-b45e-6c47343aaa13	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
320e7b15-53a1-40a2-95e4-76ff7b70d2a5	b5837d17-e31c-4cf0-b45e-6c47343aaa13	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
908023dd-8f27-4217-a525-64acb4d2c250	b5837d17-e31c-4cf0-b45e-6c47343aaa13	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
564f8458-fd54-4671-bf2f-6c8aaafd8cb6	b5837d17-e31c-4cf0-b45e-6c47343aaa13	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c10e3879-f000-43fa-bc03-c63c3955440d	b5837d17-e31c-4cf0-b45e-6c47343aaa13	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
fecc47a4-0e25-4d76-b91e-bdcab0d365e8	b5837d17-e31c-4cf0-b45e-6c47343aaa13	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
0315f0aa-7c4b-44e8-a273-dc7d9c5fb738	b5837d17-e31c-4cf0-b45e-6c47343aaa13	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4c21fe0b-c725-440c-bb2f-9c0766d0b73f	b5837d17-e31c-4cf0-b45e-6c47343aaa13	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6786ce0d-8fd8-4538-af64-e060a8ed7f41	b5837d17-e31c-4cf0-b45e-6c47343aaa13	31	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
fb28ceb0-bc88-49a7-87e4-2390d798efbf	b5837d17-e31c-4cf0-b45e-6c47343aaa13	32	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
28c2b5cc-1004-495b-af40-246074565593	b5837d17-e31c-4cf0-b45e-6c47343aaa13	33	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
bbc77045-967f-4ac9-8b95-4d334f316118	b5837d17-e31c-4cf0-b45e-6c47343aaa13	34	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
93f4b9a4-725a-4f07-8798-2cda7e0dc345	b5837d17-e31c-4cf0-b45e-6c47343aaa13	35	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6496095a-c1c5-466d-9684-964af869e213	b5837d17-e31c-4cf0-b45e-6c47343aaa13	36	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d087ee76-b261-444f-a5c4-f2c8d5b25ff2	b5837d17-e31c-4cf0-b45e-6c47343aaa13	37	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
21e65918-19b2-4215-96d4-a12af6b7a394	b5837d17-e31c-4cf0-b45e-6c47343aaa13	38	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b9bdbd75-3b03-4887-83d3-1b29defaa2a6	b5837d17-e31c-4cf0-b45e-6c47343aaa13	39	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
75c9baf4-635b-432c-9236-a99ab13ffe89	b5837d17-e31c-4cf0-b45e-6c47343aaa13	40	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
934d65a0-5a1e-408c-b43e-9b7fbada06b6	b5837d17-e31c-4cf0-b45e-6c47343aaa13	41	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
42bb1c8b-fad4-4601-882a-ca8442249e69	b5837d17-e31c-4cf0-b45e-6c47343aaa13	42	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3a3a44aa-3c0e-4f32-b084-c3d40b080747	b5837d17-e31c-4cf0-b45e-6c47343aaa13	43	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9dbd3f0d-e8fd-4fff-9d03-c3d792e19f58	b5837d17-e31c-4cf0-b45e-6c47343aaa13	44	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f11910c5-bac0-4f9d-9104-81e11058d44d	b5837d17-e31c-4cf0-b45e-6c47343aaa13	45	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
49e9174b-5456-496a-96e9-dfe871c5639d	b5837d17-e31c-4cf0-b45e-6c47343aaa13	46	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6fb10fcc-f963-4d34-b459-51901d6f8222	b5837d17-e31c-4cf0-b45e-6c47343aaa13	47	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
360e0d78-32af-4f9e-a723-42cd30a500fd	b5837d17-e31c-4cf0-b45e-6c47343aaa13	48	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ea95943c-82a8-4159-ae49-f66f5c9a8097	b5837d17-e31c-4cf0-b45e-6c47343aaa13	49	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
56fbb74c-a9ca-488c-a683-a83dc52ba8c9	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
70f5b73c-8d62-4bf6-a2a4-eb3f4e6997ee	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e76b24bf-9939-4f3f-81db-07be5e04783c	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ab9bdedf-dd53-489f-90dd-006b40a29e86	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
00bbae46-556a-4c94-b025-ee193621ace8	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e78a0200-44a3-4471-a153-a8964870c912	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7c26faa3-9d9d-41a8-913e-115e05543244	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
98b81dc8-9312-499f-8816-5b852545795f	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
dc5c4490-ebcd-4ce2-aa65-27433e435036	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2a04232f-cdcb-46dc-88ef-dc9f39cd1a4b	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9b71234e-d1e8-4708-be76-7a64e90d9b85	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6aee29cb-0e75-4805-9762-9a8f878b8b4a	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
5ff89e46-6c28-40a1-89b6-db6a8e440f59	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
eca8a89a-fe0d-407c-9914-fb5796df688c	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b4dcc131-ec00-4588-b877-7822a5521000	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cbef943f-77e2-4168-b9d4-93eaa20a2292	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d28ac73a-7d65-445f-bd86-1887da9bf754	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b79a961c-01c0-4271-9aee-98caef10facc	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7bc72254-e763-49d3-8c34-311dd07af490	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ca9014e8-13eb-4dfd-8126-6aae2b180ccf	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
dc0fe66e-9852-4ca1-8962-4808f1c437f9	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
23cee798-c968-4b00-9fb7-f9d15199c43a	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d49cb236-2f05-4fc5-82c7-aed3c75bdc52	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a25dbe00-acbe-4759-bf76-ac1b6c634a39	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
67eddfdc-53fb-42ad-9365-0e5a72a4fa25	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4608b337-6dba-42f3-a052-75521341ca30	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
91c13c2b-5645-4872-8825-c6fddae4c91a	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
261b5270-f3fa-4b25-ac84-e05238451a24	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4644d5d0-427e-4b1c-b42d-693074f7a421	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cd0f700a-f19c-4bc9-86c3-ff0c2e8ac5f6	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
549d5d84-7f65-424c-8acc-1636fc0bd04f	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c2400b91-a33a-48f2-9051-c3d2b760529a	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
74fba0af-4808-4251-bf19-789bec586bed	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
443a0812-58e7-442b-a9ca-d480c0e7d8a4	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	31	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b31a0713-5a54-4c40-a58f-9b8632bda4e1	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	32	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4566ab67-211e-41d8-a1c3-0ef8225db375	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	33	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
05e641fa-5592-44ff-8924-14a9ccfe81db	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	34	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9e4d90b8-42d1-45ff-9a09-b6b41438aed3	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	35	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3cc227a0-6427-43f4-90ae-f619f29cfefa	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	36	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
79929fa4-0bcb-41ab-b6f2-bf484dd261bf	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	37	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3403c423-0826-42fe-8862-235a076ed2a6	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	38	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a62bd378-4024-4ae7-b8dd-62def0f5b71c	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	39	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7081497f-a882-4bb5-b531-e62ee3ad3b58	723dee10-b8c2-499f-b2a8-dc04e9f43acc	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7c92ad63-7863-41b9-ad0e-04cd1e6984eb	723dee10-b8c2-499f-b2a8-dc04e9f43acc	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cfd52299-4200-4f18-92b2-23a2fb276056	723dee10-b8c2-499f-b2a8-dc04e9f43acc	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2a706739-1fee-4000-9a64-5c0a9bec42ea	723dee10-b8c2-499f-b2a8-dc04e9f43acc	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
673a7777-7bce-4a1d-9904-02c18499b3ec	723dee10-b8c2-499f-b2a8-dc04e9f43acc	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
57fd5d07-30d0-40af-8635-18b574b338dd	723dee10-b8c2-499f-b2a8-dc04e9f43acc	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
95c3a889-ee6b-422c-98ae-1ff8d9bb3961	723dee10-b8c2-499f-b2a8-dc04e9f43acc	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a5c39260-a936-41b4-a364-95b855286d2f	723dee10-b8c2-499f-b2a8-dc04e9f43acc	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b760f878-446c-45c1-8102-bd40172995d3	723dee10-b8c2-499f-b2a8-dc04e9f43acc	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a1007539-f5be-4cc6-bcc8-80906c68538f	723dee10-b8c2-499f-b2a8-dc04e9f43acc	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a45e4a8e-06d1-46d5-bac5-9a45df346f61	723dee10-b8c2-499f-b2a8-dc04e9f43acc	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
414f4a1f-3425-412c-9592-fe8fd4f68b06	723dee10-b8c2-499f-b2a8-dc04e9f43acc	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d690a9e9-3340-47fc-9728-ffa428b8dff9	723dee10-b8c2-499f-b2a8-dc04e9f43acc	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1c3b6515-1106-4b13-b00b-7d1b17c023d3	723dee10-b8c2-499f-b2a8-dc04e9f43acc	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4d21e5b7-c965-48fb-af87-275276a0664d	723dee10-b8c2-499f-b2a8-dc04e9f43acc	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3d0b7200-b194-4367-bdd3-f92d24c4ba46	723dee10-b8c2-499f-b2a8-dc04e9f43acc	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
dc39952b-5388-4c8d-a978-26bf79af9ed3	723dee10-b8c2-499f-b2a8-dc04e9f43acc	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ab837eca-8768-4d89-8ac7-71e0e0bb280c	723dee10-b8c2-499f-b2a8-dc04e9f43acc	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
99986002-1966-4067-9895-dbfb6e5efe49	723dee10-b8c2-499f-b2a8-dc04e9f43acc	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a5288ee4-8a99-487e-a217-915a5214eb97	723dee10-b8c2-499f-b2a8-dc04e9f43acc	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
37a10ca5-9d37-4b4d-9f7f-a74098fe2f04	723dee10-b8c2-499f-b2a8-dc04e9f43acc	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d13c5e6a-4419-4a95-bc3b-6640ab032736	723dee10-b8c2-499f-b2a8-dc04e9f43acc	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ce288732-e3d9-45aa-bb37-478045cdea4c	723dee10-b8c2-499f-b2a8-dc04e9f43acc	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
98110e98-aa59-42b9-b97f-ff61b9e86e80	723dee10-b8c2-499f-b2a8-dc04e9f43acc	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c2a4a544-b15e-47ae-a64b-31e53425a2bc	723dee10-b8c2-499f-b2a8-dc04e9f43acc	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3e911979-3947-4872-b082-ad31394523f7	723dee10-b8c2-499f-b2a8-dc04e9f43acc	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
530dc1c2-4641-4cf3-a5bb-0bc831a4bee2	723dee10-b8c2-499f-b2a8-dc04e9f43acc	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
94233192-3818-4dd6-acad-879d6581476c	723dee10-b8c2-499f-b2a8-dc04e9f43acc	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e4c86094-e73d-4fc0-b99e-db41c85ff854	723dee10-b8c2-499f-b2a8-dc04e9f43acc	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
db833cc3-b3dc-4aba-b534-0e643a393ffc	723dee10-b8c2-499f-b2a8-dc04e9f43acc	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
0fbb274f-3700-446c-9469-e15fa6235f7f	723dee10-b8c2-499f-b2a8-dc04e9f43acc	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
bb81dbed-0c24-4503-a1e9-e0192bf27358	723dee10-b8c2-499f-b2a8-dc04e9f43acc	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
903bea95-d00c-41d9-b4cc-4270f5ce53de	723dee10-b8c2-499f-b2a8-dc04e9f43acc	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4c9a9715-6ee8-4a7f-a7af-78226c0c1fac	723dee10-b8c2-499f-b2a8-dc04e9f43acc	31	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c6ae9944-1337-4fd3-91b1-0e70c058f3fa	723dee10-b8c2-499f-b2a8-dc04e9f43acc	32	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
c9f99791-ed97-47b7-9a41-1eec187766d0	723dee10-b8c2-499f-b2a8-dc04e9f43acc	33	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
67a976e3-855f-4340-bb9a-f5a95e0ad92b	723dee10-b8c2-499f-b2a8-dc04e9f43acc	34	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ae5b2fd6-32cc-4866-b629-39aed41ab438	723dee10-b8c2-499f-b2a8-dc04e9f43acc	35	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
646b2990-bf29-4956-a5e2-504ee264e784	723dee10-b8c2-499f-b2a8-dc04e9f43acc	36	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
8e5a4030-4386-48f7-a62c-c52353da364d	723dee10-b8c2-499f-b2a8-dc04e9f43acc	37	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d21632b7-8dd4-4f50-9654-fdc6a11aa9d4	723dee10-b8c2-499f-b2a8-dc04e9f43acc	38	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
802c9bcb-e008-489c-bf27-1039c23788f6	723dee10-b8c2-499f-b2a8-dc04e9f43acc	39	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
0e7b823c-0590-48a1-9ece-38f603f7e082	723dee10-b8c2-499f-b2a8-dc04e9f43acc	40	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7b4570f9-f384-4e99-a988-3f337e8082f7	723dee10-b8c2-499f-b2a8-dc04e9f43acc	41	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
06616de2-fc31-457f-8f7c-7423badd83e1	6885faba-a1bf-44c4-b698-38cc98f19aee	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
69e2f145-6e31-4e97-83f6-88007b1808b9	6885faba-a1bf-44c4-b698-38cc98f19aee	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b48d2842-da36-409a-b201-1f1c9aa5c302	6885faba-a1bf-44c4-b698-38cc98f19aee	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ea5be649-e717-4385-8542-ed6b8915ad2f	6885faba-a1bf-44c4-b698-38cc98f19aee	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
25f36a9c-e364-4ce5-b416-b21f6e59ff54	6885faba-a1bf-44c4-b698-38cc98f19aee	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
36250c83-f8f7-4189-aa68-7da1cc1157f1	6885faba-a1bf-44c4-b698-38cc98f19aee	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
640fc5fc-4131-4e3e-afbf-1be4a64cfb85	6885faba-a1bf-44c4-b698-38cc98f19aee	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ebef4d0e-fd03-4908-8570-6380953bd939	6885faba-a1bf-44c4-b698-38cc98f19aee	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
76fee12f-8c16-4e42-8335-77604bd14d14	6885faba-a1bf-44c4-b698-38cc98f19aee	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
12e8de9e-3c6d-4210-8bf8-b5d75b81c0d1	6885faba-a1bf-44c4-b698-38cc98f19aee	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6d53194b-c301-4e32-8550-e358608daa9a	6885faba-a1bf-44c4-b698-38cc98f19aee	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ed81fcde-b26b-48b8-bc89-c9c703be469b	6885faba-a1bf-44c4-b698-38cc98f19aee	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a77f6bce-648f-44b8-b7e7-6086bbd75926	6885faba-a1bf-44c4-b698-38cc98f19aee	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
af8c6822-9d6f-46dc-8c18-f546f6efa349	6885faba-a1bf-44c4-b698-38cc98f19aee	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3fc0d536-181b-4e41-a7ac-2c93928f7b58	6885faba-a1bf-44c4-b698-38cc98f19aee	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4955d95d-f733-424e-92e1-e4b8341dab24	6885faba-a1bf-44c4-b698-38cc98f19aee	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f5bc2b2e-758a-4753-aab4-0f10d6924f3e	6885faba-a1bf-44c4-b698-38cc98f19aee	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a88c366f-892f-4ee9-86df-f18f4a3d927f	6885faba-a1bf-44c4-b698-38cc98f19aee	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f3b6e3b1-cbe6-47b5-b56f-6bddc5827c2e	6885faba-a1bf-44c4-b698-38cc98f19aee	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a885179a-a117-4489-8831-20d1f62a061b	6885faba-a1bf-44c4-b698-38cc98f19aee	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
99553b10-53df-41b4-8a8f-41bc352cd228	6885faba-a1bf-44c4-b698-38cc98f19aee	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
325730f6-8e75-4303-873a-6d31159b3cf0	6885faba-a1bf-44c4-b698-38cc98f19aee	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4b2aaafe-b2da-413d-a509-2b202d5972b0	6885faba-a1bf-44c4-b698-38cc98f19aee	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
eeb14b2e-6ad4-4e94-832b-5fdb1e4c7bcc	6885faba-a1bf-44c4-b698-38cc98f19aee	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
489ddbdf-0016-4f5e-8ef4-521b46012f33	6885faba-a1bf-44c4-b698-38cc98f19aee	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7a0f304f-0b71-4c60-9519-8b79c11c7735	6885faba-a1bf-44c4-b698-38cc98f19aee	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e3e95dd2-907c-415f-a69f-21cd49cb9b71	6885faba-a1bf-44c4-b698-38cc98f19aee	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
73036b90-9e01-461c-858f-68c74f82d6d2	6885faba-a1bf-44c4-b698-38cc98f19aee	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6f8131f5-f4fa-44bc-846f-8629d6a0a7d8	6885faba-a1bf-44c4-b698-38cc98f19aee	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
87e4bc61-a2d9-4551-baa0-ab8142792e0d	6885faba-a1bf-44c4-b698-38cc98f19aee	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
db5c084b-809f-47ba-9e0b-2838b2728110	6885faba-a1bf-44c4-b698-38cc98f19aee	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
96227c79-a4a9-4e9f-9b96-deda5b9875a8	6885faba-a1bf-44c4-b698-38cc98f19aee	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
a1a0067d-cc4d-4c18-9ebd-9e1eada513fa	6885faba-a1bf-44c4-b698-38cc98f19aee	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
39d53cbc-ce0f-4453-8b6d-0e9398e614de	6cb90104-4cd6-42c7-ae28-57177bae10ae	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
edba5acf-80b9-4d2f-a768-b212e65c30df	6cb90104-4cd6-42c7-ae28-57177bae10ae	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
454fe0df-ac06-408f-a5ed-275314fed3df	6cb90104-4cd6-42c7-ae28-57177bae10ae	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
5b79990b-c306-468e-979e-1913eb625697	6cb90104-4cd6-42c7-ae28-57177bae10ae	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cae8359a-03b5-40c0-9b80-da6a43f37c1a	6cb90104-4cd6-42c7-ae28-57177bae10ae	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cea4a785-d61d-404d-b6d9-83dbeb88e442	6cb90104-4cd6-42c7-ae28-57177bae10ae	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ad60e9f7-3747-40b0-b411-64ababa9866f	6cb90104-4cd6-42c7-ae28-57177bae10ae	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e7608450-511d-45be-b31d-40fd0470edbf	6cb90104-4cd6-42c7-ae28-57177bae10ae	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
434237c5-6745-44ff-b40f-9bed87544c91	6cb90104-4cd6-42c7-ae28-57177bae10ae	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1d9483a6-f810-4e61-a127-467f0c242ba4	6cb90104-4cd6-42c7-ae28-57177bae10ae	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d37d6816-4fe5-4786-842f-77dcd0393a92	6cb90104-4cd6-42c7-ae28-57177bae10ae	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ac69f151-a5ce-4af8-980b-12735987aa6f	6cb90104-4cd6-42c7-ae28-57177bae10ae	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
69584672-a6f2-4e4e-8cc6-aa625275f394	6cb90104-4cd6-42c7-ae28-57177bae10ae	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
090061b8-71b4-4fda-b74e-e93e3f6f64ba	6cb90104-4cd6-42c7-ae28-57177bae10ae	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
82b54d5c-5f0f-4c9d-ab98-34c430562eb8	6cb90104-4cd6-42c7-ae28-57177bae10ae	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
de33e78a-3ca5-4730-913e-16904858dc7b	6cb90104-4cd6-42c7-ae28-57177bae10ae	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1c955922-7ab2-4fe6-8da6-da21669070d0	6cb90104-4cd6-42c7-ae28-57177bae10ae	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1447174b-82a1-4587-ba99-a8193d6c92f4	6cb90104-4cd6-42c7-ae28-57177bae10ae	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
bdd79799-31dd-4554-afc1-e58a89c8da75	6cb90104-4cd6-42c7-ae28-57177bae10ae	16	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
cfb0606b-f130-4b96-a56a-d01aef6bc593	6cb90104-4cd6-42c7-ae28-57177bae10ae	17	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
8218a216-1e5b-4b8c-b918-cbca16c4f735	6cb90104-4cd6-42c7-ae28-57177bae10ae	18	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
ec35e2bb-6120-49a4-84cf-640ee340ff1f	6cb90104-4cd6-42c7-ae28-57177bae10ae	19	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
dc12e17b-398b-4dee-8377-dcf82acb6708	6cb90104-4cd6-42c7-ae28-57177bae10ae	20	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3a2ed781-8949-4593-9335-1cec03f338a6	6cb90104-4cd6-42c7-ae28-57177bae10ae	21	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2ee8fff8-41b9-4cc6-ad01-c1e03cc6d465	6cb90104-4cd6-42c7-ae28-57177bae10ae	22	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
fb9d990e-020d-435f-8116-bc7501e0498f	6cb90104-4cd6-42c7-ae28-57177bae10ae	23	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3b49ad3d-4285-404c-a49a-91e414f7bdd9	6cb90104-4cd6-42c7-ae28-57177bae10ae	24	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
2d2b86d0-275a-4d92-bacd-2dde68190c67	6cb90104-4cd6-42c7-ae28-57177bae10ae	25	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
67454b6d-7fa5-4b51-8f1a-e6c9f7948d8b	6cb90104-4cd6-42c7-ae28-57177bae10ae	26	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
51cf7849-bce7-403c-acf0-8bef7f8716cf	6cb90104-4cd6-42c7-ae28-57177bae10ae	27	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
eb0f22d2-f590-4258-9d15-6e42a28d699a	6cb90104-4cd6-42c7-ae28-57177bae10ae	28	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3a338f41-bbf0-448d-a7f7-987d52d7ac12	6cb90104-4cd6-42c7-ae28-57177bae10ae	29	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
13be2dad-26ef-465c-9564-429f74048a11	6cb90104-4cd6-42c7-ae28-57177bae10ae	30	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
0c3ad758-2e86-41b8-b807-707ea71d3ef0	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e0e855ad-845c-4799-8bdc-80664471b8b1	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
fabf788a-01d9-4aa4-9051-d153bff72f3a	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
438f384b-d0f0-41d0-929a-d48968445005	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
63a82160-5de9-4019-b99c-b8ffe77ee068	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
fa4dda17-7cb0-414c-af68-64c687f6f870	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
769a06e7-a9ab-4521-9bdd-589d6b8f0b79	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d917b993-2efd-4474-9b7b-9d5f2f9b6fe2	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
39934644-499d-493e-9ec8-e92b9c619aef	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
84820c20-cf4f-4426-84a2-5a30095bd668	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
13dd810d-cd30-4fa8-b4be-3a1e172a63d9	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9f2a1bce-674e-4d1b-b902-6e4a36a63865	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
dda88eb2-dd56-4939-81bf-d8f1c23c8209	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
49369460-dd95-4026-973d-d284c4725149	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
e65397b4-0645-4e4e-880a-f1f3acf5efce	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
b19a6a8f-11d2-4aeb-acdd-ef5589995049	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
4ec7cdb9-6013-4fda-945f-1892640acd53	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
35a6365b-1f8f-4d1b-8996-6bea0128c22e	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
5ba120e6-87a3-4bb9-b49a-32ec7da5dba1	8080912d-b59c-4b97-bafc-6aede5f9109f	-2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f35419c3-a944-4908-9d34-cba00d616486	8080912d-b59c-4b97-bafc-6aede5f9109f	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
5749b73c-27ba-4d02-9227-821c34a9becf	8080912d-b59c-4b97-bafc-6aede5f9109f	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
154727b0-6c9d-4bd6-a876-999a898abc01	8080912d-b59c-4b97-bafc-6aede5f9109f	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
df16ba4e-b9eb-433a-bfc9-f13f945e0854	8080912d-b59c-4b97-bafc-6aede5f9109f	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1d337a0a-8f43-4311-8496-c1fe38953693	8080912d-b59c-4b97-bafc-6aede5f9109f	3	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
26a45378-b46a-4106-8066-14aebde3f7e8	8080912d-b59c-4b97-bafc-6aede5f9109f	4	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
702882ce-f7b0-4367-a747-53817fdfcd18	8080912d-b59c-4b97-bafc-6aede5f9109f	5	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
91f77875-4265-4f66-9ad2-5b3260fb0c5a	8080912d-b59c-4b97-bafc-6aede5f9109f	6	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
1187c5c2-c239-4fa2-9f7c-196f1e63cc87	8080912d-b59c-4b97-bafc-6aede5f9109f	7	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
26fbc19c-5fb0-4666-a0b5-f2b2c21e0e81	8080912d-b59c-4b97-bafc-6aede5f9109f	8	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
9047e990-b3e5-42dd-8421-77b30a6d83ba	8080912d-b59c-4b97-bafc-6aede5f9109f	9	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
93d1eef6-5aff-4878-9d7e-8f502771fa41	8080912d-b59c-4b97-bafc-6aede5f9109f	10	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
56d9c7e2-4b19-4852-8117-efa8badd6a24	8080912d-b59c-4b97-bafc-6aede5f9109f	11	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
6da0e9d0-2719-43fe-919e-8067ee454d17	8080912d-b59c-4b97-bafc-6aede5f9109f	12	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
59736d22-ad50-4ee1-960d-dca18f587859	8080912d-b59c-4b97-bafc-6aede5f9109f	13	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
25c56645-bc3d-4ca2-9dd9-30c19ca7f032	8080912d-b59c-4b97-bafc-6aede5f9109f	14	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
364cca0b-fb7a-442b-a280-77d707169d42	8080912d-b59c-4b97-bafc-6aede5f9109f	15	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
0a9385fb-f7d4-441c-8784-14ecc77921e6	0e0f7096-788f-4927-8350-e17cb0320d53	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
f31dbc93-7860-4089-8b1e-b188feab5169	0e0f7096-788f-4927-8350-e17cb0320d53	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
48a64882-0c31-4e02-81e9-207da7bb709c	0e0f7096-788f-4927-8350-e17cb0320d53	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
64cf119d-9b36-485c-aa1a-40e77b119d69	0e0f7096-788f-4927-8350-e17cb0320d53	2	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
83178b8b-8307-44f6-98ce-315779caf393	42c469b1-689d-4dec-b351-de2e91b5605b	-1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
d5ac761a-8715-4ca1-aa5c-b77616c283a5	42c469b1-689d-4dec-b351-de2e91b5605b	0	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
3df83707-9d43-474a-a050-37341c543bd3	42c469b1-689d-4dec-b351-de2e91b5605b	1	2025-08-15 08:19:54.095835+00	2025-08-15 08:19:54.095835+00
7035b470-306e-43d3-b59b-180ab252fc81	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	-2	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
69401220-7af0-461c-a496-6e4ca44b218f	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	-1	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
e5cb4d39-23aa-4832-9298-fddfb96efbee	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	0	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
6f904f6a-d769-4ce3-bc99-bb603fa604af	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	1	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
da918cfc-98b6-4e90-9346-838662283832	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	2	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
6257a9e5-8490-4707-80b5-4676ed095b7b	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	3	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
4d50ffb0-3756-4409-a74f-5757a7729d1e	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	4	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
6ec20ca5-05d9-4e16-acae-f05b8ca98c4d	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	5	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
42612921-e3e9-4b50-a17b-702707e6e1fa	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	6	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
b1f988d5-c425-410e-9623-88f32415fff8	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	7	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
7600d9ef-5c84-4623-bfd0-ae073b5d155f	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	8	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
3fa46cdd-cd75-4605-affb-101287b2f2ee	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	9	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
90886818-8a21-49e1-bf86-779b20632fd8	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	10	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
cf5d31a4-a6b2-40d0-b0c2-51877ac1927e	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	11	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
3aeacb1b-3e4a-4f42-942b-b04f1a57e3b2	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	12	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
60a10bf4-4b64-4317-a34a-e8fcbf29b9a2	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	13	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
fa6dac74-c245-4e7b-9677-dae721c6dbc9	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	14	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
727d9329-5042-4455-b2af-6e83eb4c8d04	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	15	2025-08-15 09:20:40.176049+00	2025-08-15 09:20:40.176049+00
ca19a999-73c1-455e-a50b-8d0a300e9b11	354ea1e5-40e5-49e7-8023-7c298ce0cd2a	-2	2025-08-15 09:20:40.279253+00	2025-08-15 09:20:40.279253+00
4b79952a-6cd0-4428-b354-5bce471f222d	354ea1e5-40e5-49e7-8023-7c298ce0cd2a	-1	2025-08-15 09:20:40.279253+00	2025-08-15 09:20:40.279253+00
a2bffcc1-b3eb-4861-ab1d-a3e001f2bd42	354ea1e5-40e5-49e7-8023-7c298ce0cd2a	0	2025-08-15 09:20:40.279253+00	2025-08-15 09:20:40.279253+00
92f069ab-ae10-48ac-b74c-b400e9f91e7d	354ea1e5-40e5-49e7-8023-7c298ce0cd2a	1	2025-08-15 09:20:40.279253+00	2025-08-15 09:20:40.279253+00
ce9e4724-0782-43ae-acf2-3544e041b50d	9f32283a-c8b7-43f2-8d86-e9e3370229eb	-2	2025-08-15 09:20:40.368942+00	2025-08-15 09:20:40.368942+00
5453eae3-c570-4486-a16f-0a9832a25ff7	9f32283a-c8b7-43f2-8d86-e9e3370229eb	-1	2025-08-15 09:20:40.368942+00	2025-08-15 09:20:40.368942+00
f131c033-f5b3-4fe6-8e01-c7568e534d16	9f32283a-c8b7-43f2-8d86-e9e3370229eb	0	2025-08-15 09:20:40.368942+00	2025-08-15 09:20:40.368942+00
b9891f8e-d4f9-47ff-befd-b0ce6ac4e8da	9f32283a-c8b7-43f2-8d86-e9e3370229eb	1	2025-08-15 09:20:40.368942+00	2025-08-15 09:20:40.368942+00
\.


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocks (id, name) FROM stdin;
c16b4784-73f0-4f1b-9401-a964d0a81aa0	1
b5837d17-e31c-4cf0-b45e-6c47343aaa13	2
01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	Основной
354ea1e5-40e5-49e7-8023-7c298ce0cd2a	стр1
9f32283a-c8b7-43f2-8d86-e9e3370229eb	стр2
6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	1
723dee10-b8c2-499f-b2a8-dc04e9f43acc	2
6885faba-a1bf-44c4-b698-38cc98f19aee	3
6cb90104-4cd6-42c7-ae28-57177bae10ae	4
4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	5
8080912d-b59c-4b97-bafc-6aede5f9109f	6
0e0f7096-788f-4927-8350-e17cb0320d53	Изба
42c469b1-689d-4dec-b351-de2e91b5605b	Удобства во дворе
\.


--
-- Data for Name: chessboard; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chessboard (id, project_id, material, "quantityPd", "quantitySpec", "quantityRd", unit_id, created_at, cost_category_code, updated_at, color) FROM stdin;
fbcd4668-4039-4802-9b9f-ad9a252cbf98	f9227acf-9446-42c8-a533-bfeb30fa07a4	м11	11	11	12	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-14 09:05:22.302747+00	\N	2025-08-14 09:05:22.302747+00	\N
b934ae15-0687-40b2-abd6-c5be161c9f96	f9227acf-9446-42c8-a533-bfeb30fa07a4	м4	111	112	113	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-13 14:52:36.608843+00	\N	2025-08-13 14:52:36.608843+00	\N
831b7173-dfb8-4093-a8d0-7d66c497ceb1	f9227acf-9446-42c8-a533-bfeb30fa07a4	мойка	1	1	1	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-14 10:31:36.85775+00	\N	2025-08-14 10:31:36.85775+00	\N
3a9dc7b0-9389-4bc0-8f8c-f4303e2786c6	f9227acf-9446-42c8-a533-bfeb30fa07a4	ограждение	5	5	5	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-14 10:31:36.85775+00	\N	2025-08-14 10:31:36.85775+00	\N
1d616d5a-253f-48b5-8e2b-d7adb4085f6c	f9227acf-9446-42c8-a533-bfeb30fa07a4	кек	14	88	\N	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 07:07:42.112412+00	\N	2025-08-14 07:07:42.112412+00	\N
75ff4968-9429-48e9-86e6-96ffbc381f7d	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон м400	200	200	220	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 11:22:06.376628+00	\N	2025-08-14 11:22:06.376628+00	\N
2b1077b7-804f-4db9-873f-ed0e204568c2	f9227acf-9446-42c8-a533-bfeb30fa07a4	м11	11	11	12	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 06:40:32.50956+00	\N	2025-08-14 06:40:32.50956+00	\N
4008d3be-7fa4-4d15-81d7-58557337a06f	f9227acf-9446-42c8-a533-bfeb30fa07a4	столбы	250	250	260	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-14 10:51:17.645111+00	\N	2025-08-14 10:51:17.645111+00	\N
54d5f309-d3ba-4c6e-9829-a2d4dd43a18f	f9227acf-9446-42c8-a533-bfeb30fa07a4	м001	1	1	1	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-13 15:08:57.003277+00	\N	2025-08-13 15:08:57.003277+00	\N
61459552-31b9-4342-a7b5-bf2191c5051e	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон м500	100	100	120	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 11:22:06.376628+00	\N	2025-08-14 11:22:06.376628+00	\N
0b4327c7-d26e-4deb-b605-495ff5686b2b	f9227acf-9446-42c8-a533-bfeb30fa07a4	м2	12	13	14	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-13 14:30:33.230128+00	\N	2025-08-13 14:30:33.230128+00	\N
63e5ca16-8cb6-4358-941d-6812b00b1c44	f9227acf-9446-42c8-a533-bfeb30fa07a4	м1	10	12	13	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-13 14:30:33.230128+00	\N	2025-08-13 14:30:33.230128+00	\N
4be2f995-fd42-4994-86a2-16ad5313ad48	f9227acf-9446-42c8-a533-bfeb30fa07a4	материал3	1	1	1	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-15 15:10:43.761323+00	\N	2025-08-15 15:10:43.761323+00	\N
7fb95665-4a07-424b-8d8e-260245f587de	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон М400	250	300	320	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 06:42:08.077475+00	\N	2025-08-14 06:42:08.077475+00	\N
35e46480-72a3-4a28-80cb-be0aa159894d	f9227acf-9446-42c8-a533-bfeb30fa07a4	Арматура 16 А500	30	30	31	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-14 06:51:17.716232+00	\N	2025-08-14 06:51:17.716232+00	\N
175defaa-4b67-46fd-9589-c66f7345109e	f9227acf-9446-42c8-a533-bfeb30fa07a4	лол	1	2	3	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-21 12:22:37.374625+00	\N	2025-08-21 12:22:37.374625+00	\N
08c60efd-ab5a-4212-b56f-68dc9d04aaad	2785fec1-eea9-4047-8287-2a897dfddc20	м5	12	12	12	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-13 14:55:16.99456+00	\N	2025-08-13 14:55:16.99456+00	\N
43cd8c94-7986-44f3-b3a4-792a7a57e091	f9227acf-9446-42c8-a533-bfeb30fa07a4	профнастил	1500	1500	1550	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-14 10:51:17.645111+00	\N	2025-08-14 10:51:17.645111+00	\N
3bad03e2-d11a-4d19-bf12-cf600070d7d5	f9227acf-9446-42c8-a533-bfeb30fa07a4	материал3	1	1	1	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-15 15:10:43.761323+00	\N	2025-08-15 15:10:43.761323+00	\N
a7893ea6-63b7-4af4-932c-17785ab53f80	f9227acf-9446-42c8-a533-bfeb30fa07a4	м12	12	12	12	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-14 09:06:14.128495+00	\N	2025-08-14 09:06:14.128495+00	yellow
bbe952d0-88ac-4c2c-b9d2-c5e3d1824cdf	f9227acf-9446-42c8-a533-bfeb30fa07a4	м3	23	24	23	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 14:30:33.230128+00	\N	2025-08-13 14:30:33.230128+00	\N
baca8c81-3b84-4625-80e0-ef6e764c108a	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон М350	\N	200	200	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 13:02:09.366675+00	\N	2025-08-14 13:02:09.366675+00	\N
9568e358-4c7b-493c-864a-20bb4a6f5df0	f9227acf-9446-42c8-a533-bfeb30fa07a4	Арматура 12 А500	\N	19	20	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-14 13:02:09.366675+00	\N	2025-08-14 13:02:09.366675+00	\N
3a2bad6b-be01-4eb0-bfa2-7a4042d78d08	f9227acf-9446-42c8-a533-bfeb30fa07a4	м7	343	343	344	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 19:38:04.025478+00	\N	2025-08-13 19:38:04.025478+00	green
060784fb-6ca9-4908-bd18-4e7c921a1f88	f9227acf-9446-42c8-a533-bfeb30fa07a4	лента	250	250	250	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-15 12:29:10.084844+00	\N	2025-08-15 12:29:10.084844+00	\N
e41fbde8-bf3b-4b80-aa43-251057eaa384	f9227acf-9446-42c8-a533-bfeb30fa07a4	лента	250	250	250	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-15 12:29:10.084844+00	\N	2025-08-15 12:29:10.084844+00	\N
103bad71-ae87-4fc5-8c24-155b71749126	f9227acf-9446-42c8-a533-bfeb30fa07a4	краска	3	3	3	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-14 12:04:43.170313+00	\N	2025-08-14 12:04:43.170313+00	blue
dbe4f647-f47f-417d-87fa-412ffa230ed2	f9227acf-9446-42c8-a533-bfeb30fa07a4	колпак	250	250	260	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-14 10:52:34.487822+00	\N	2025-08-14 10:52:34.487822+00	green
eac7f515-af02-4f52-8615-bf901de475e1	f9227acf-9446-42c8-a533-bfeb30fa07a4	м117	1	1	7	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
e360a60b-8594-47c8-b170-cf8150e87b6d	f9227acf-9446-42c8-a533-bfeb30fa07a4	м119	1	1	9	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
69d9ee54-9fce-49e9-aae0-ec078b24da91	f9227acf-9446-42c8-a533-bfeb30fa07a4	м116	1	6	\N	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
f5708d22-e60f-4b35-8a0d-f070b6568872	f9227acf-9446-42c8-a533-bfeb30fa07a4	м115	5	1	\N	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
a23d8e8a-e8fc-4bda-8201-eacdd46b24cc	f9227acf-9446-42c8-a533-bfeb30fa07a4	м114	4	4	\N	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
7dcbbd60-429d-4664-be97-4749b39bb307	f9227acf-9446-42c8-a533-bfeb30fa07a4	Арматура 12 А500	\N	20	\N	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-14 14:26:46.787181+00	\N	2025-08-14 14:26:46.787181+00	\N
8b51be6b-a2c4-43c8-aa64-21412899256c	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон М350	\N	200	\N	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-14 14:26:46.787181+00	\N	2025-08-14 14:26:46.787181+00	\N
7e0de9b9-521c-4e37-ad7c-7bd32742b76d	f9227acf-9446-42c8-a533-bfeb30fa07a4	м112	2	2	2	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
7460d9d7-dc64-47fa-9da2-b1bfa1ba07a4	f9227acf-9446-42c8-a533-bfeb30fa07a4	м113	3	3	3	92d5fd4d-eb25-4562-9292-a3defdcbb01e	2025-08-15 12:31:28.403279+00	\N	2025-08-15 12:31:28.403279+00	\N
150ca51a-60b7-41b8-9010-101b141d5876	f9227acf-9446-42c8-a533-bfeb30fa07a4	Арматура 12 А500	10	8	9	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-14 06:51:17.716232+00	\N	2025-08-14 06:51:17.716232+00	red
c44f5021-ecef-4bf3-af8f-613405bf65fe	f9227acf-9446-42c8-a533-bfeb30fa07a4	Бетон М500	50	50	55	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-15 21:58:49.551943+00	\N	2025-08-15 21:58:49.551943+00	\N
6daba469-3956-45c5-ae33-0a314ea26dd8	f9227acf-9446-42c8-a533-bfeb30fa07a4	Доска 50х150	15	15	15	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-16 06:31:57.568763+00	\N	2025-08-16 06:31:57.568763+00	\N
f2d1f446-0d6a-42b7-85f1-c423b080014a	f9227acf-9446-42c8-a533-bfeb30fa07a4	блоки 200	20	20	21	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-26 08:38:39.13729+00	\N	2025-08-26 08:38:39.13729+00	\N
b4160375-4a5d-4b8b-b3e0-94d459dcc861	f9227acf-9446-42c8-a533-bfeb30fa07a4	колонна	\N	\N	\N	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-26 09:07:19.227378+00	\N	2025-08-26 09:07:19.227378+00	\N
dda87bf3-8cd9-4a88-9e54-bd6b351a0213	f9227acf-9446-42c8-a533-bfeb30fa07a4	блок 150	30	30	30	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-26 09:08:01.101611+00	\N	2025-08-26 09:08:01.101611+00	\N
9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	f9227acf-9446-42c8-a533-bfeb30fa07a4	блок 150	1	1	1	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-27 12:32:15.664093+00	\N	2025-08-27 12:32:15.664093+00	\N
\.


--
-- Data for Name: chessboard_documentation_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chessboard_documentation_mapping (id, chessboard_id, documentation_id) FROM stdin;
70ec0324-1a67-4441-b2db-fc2695a48f5b	175defaa-4b67-46fd-9589-c66f7345109e	3f19c800-5d2c-4ba0-8036-fe37bc21f6d5
2895a399-d2d3-4b83-9640-11ad8108af1f	6daba469-3956-45c5-ae33-0a314ea26dd8	3f19c800-5d2c-4ba0-8036-fe37bc21f6d5
f8ebfed6-01f8-4396-ac62-fa41c943d4f3	c44f5021-ecef-4bf3-af8f-613405bf65fe	3f19c800-5d2c-4ba0-8036-fe37bc21f6d5
7ab99e92-2d6d-4ffc-a1b7-ef9e400f9983	f2d1f446-0d6a-42b7-85f1-c423b080014a	fa34f1a8-58c3-4c9e-8205-da6b56132658
a0e0115e-41a3-401f-acbe-8baf822c0962	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	fa34f1a8-58c3-4c9e-8205-da6b56132658
\.


--
-- Data for Name: chessboard_floor_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chessboard_floor_mapping (id, chessboard_id, floor_number, created_at, updated_at) FROM stdin;
bb8640ce-0cad-4216-8a5f-561688c633b9	8b51be6b-a2c4-43c8-aa64-21412899256c	1	2025-08-16 06:33:05.026431+00	2025-08-16 06:33:05.026431+00
e3cb5214-67f5-4107-96ae-f64f4e9473a5	8b51be6b-a2c4-43c8-aa64-21412899256c	2	2025-08-16 06:33:05.026431+00	2025-08-16 06:33:05.026431+00
0edceb09-1b7f-4f06-ae6e-18d048910c1b	8b51be6b-a2c4-43c8-aa64-21412899256c	3	2025-08-16 06:33:05.026431+00	2025-08-16 06:33:05.026431+00
85f706b1-4875-4d77-9e6c-5e0c42ca28c3	8b51be6b-a2c4-43c8-aa64-21412899256c	4	2025-08-16 06:33:05.026431+00	2025-08-16 06:33:05.026431+00
5fe36b17-5a13-4866-b208-3cbb09f7d6ef	8b51be6b-a2c4-43c8-aa64-21412899256c	5	2025-08-16 06:33:05.026431+00	2025-08-16 06:33:05.026431+00
7aa24464-8bb7-4255-aacd-84c41d4a529e	7dcbbd60-429d-4664-be97-4749b39bb307	1	2025-08-16 06:33:05.046811+00	2025-08-16 06:33:05.046811+00
0eae17b8-67b5-4afc-9b48-e4267c8c1ff9	7dcbbd60-429d-4664-be97-4749b39bb307	2	2025-08-16 06:33:05.046811+00	2025-08-16 06:33:05.046811+00
fa6f255f-0ff5-471d-83f5-810999dda53a	7dcbbd60-429d-4664-be97-4749b39bb307	3	2025-08-16 06:33:05.046811+00	2025-08-16 06:33:05.046811+00
e7dfda48-4712-4682-81b0-ee3c1b670431	7dcbbd60-429d-4664-be97-4749b39bb307	4	2025-08-16 06:33:05.046811+00	2025-08-16 06:33:05.046811+00
9e415c9c-90ae-4aff-9fb6-280699707908	7dcbbd60-429d-4664-be97-4749b39bb307	5	2025-08-16 06:33:05.046811+00	2025-08-16 06:33:05.046811+00
eb31bbc3-0c7e-4ed9-beda-9cafa6f756aa	6daba469-3956-45c5-ae33-0a314ea26dd8	1	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
9986ff35-cff2-480e-98f6-c6b3c807f2ac	c44f5021-ecef-4bf3-af8f-613405bf65fe	1	2025-08-22 12:24:24.007765+00	2025-08-22 12:24:24.007765+00
080b150d-8e85-4a31-91a3-8f22d41de68f	c44f5021-ecef-4bf3-af8f-613405bf65fe	2	2025-08-22 12:24:24.007765+00	2025-08-22 12:24:24.007765+00
1eb9d01e-12f7-477a-9627-c648d84b73fa	6daba469-3956-45c5-ae33-0a314ea26dd8	2	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
26ff4b20-f345-41f6-97f7-62587c9658f8	c44f5021-ecef-4bf3-af8f-613405bf65fe	3	2025-08-22 12:24:24.007765+00	2025-08-22 12:24:24.007765+00
e0d7f5bc-7d78-4950-a8ae-a844f403fbe1	c44f5021-ecef-4bf3-af8f-613405bf65fe	4	2025-08-22 12:24:24.007765+00	2025-08-22 12:24:24.007765+00
a4cb9c21-152a-4027-90b8-7abad3ef7b0f	6daba469-3956-45c5-ae33-0a314ea26dd8	3	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
5808e764-31b4-4d18-8064-7c9d22d8e79a	c44f5021-ecef-4bf3-af8f-613405bf65fe	5	2025-08-22 12:24:24.007765+00	2025-08-22 12:24:24.007765+00
22879505-12b4-4ab7-ba9c-5b9217573e4e	6daba469-3956-45c5-ae33-0a314ea26dd8	4	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
2b78fc17-6246-489f-a2d2-7d6a1e576e3b	6daba469-3956-45c5-ae33-0a314ea26dd8	5	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
40780efe-b96a-4f51-a7e0-5054098cdaa6	6daba469-3956-45c5-ae33-0a314ea26dd8	6	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
3702158d-92fc-4a2a-ad78-008272c823b2	6daba469-3956-45c5-ae33-0a314ea26dd8	7	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
0f65e729-eeaf-4b27-902a-af5b9b89521c	6daba469-3956-45c5-ae33-0a314ea26dd8	8	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
45fa7d6f-95cd-45a2-a247-b635ae877833	6daba469-3956-45c5-ae33-0a314ea26dd8	9	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
fa421aed-fc1f-44e8-9afa-7bb623c920c8	6daba469-3956-45c5-ae33-0a314ea26dd8	10	2025-08-22 12:24:24.00821+00	2025-08-22 12:24:24.00821+00
a4fcd869-87f2-409b-8f0a-24b55e1c58b0	f2d1f446-0d6a-42b7-85f1-c423b080014a	2	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
7471e770-2fe2-461d-910c-9cd8edd81f06	f2d1f446-0d6a-42b7-85f1-c423b080014a	3	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
6e1fc7af-850a-4c30-919a-45024f87e14f	f2d1f446-0d6a-42b7-85f1-c423b080014a	4	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
5bdb4a6c-ccd0-4755-a93c-cf9af560c82a	f2d1f446-0d6a-42b7-85f1-c423b080014a	5	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
fac68a14-f868-4416-96f4-e301abcfec24	f2d1f446-0d6a-42b7-85f1-c423b080014a	6	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
b3feca3e-a22a-404a-8870-6085b1309cc7	f2d1f446-0d6a-42b7-85f1-c423b080014a	7	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
a80f905f-e9fb-41bd-ad06-fb8b58ab14c0	f2d1f446-0d6a-42b7-85f1-c423b080014a	8	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
b7689ee2-67b6-4497-844d-df72e93eb84f	f2d1f446-0d6a-42b7-85f1-c423b080014a	9	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
973f8226-5898-4df2-95b4-6757a81149f9	f2d1f446-0d6a-42b7-85f1-c423b080014a	10	2025-08-26 08:46:01.726143+00	2025-08-26 08:46:01.726143+00
0f3baaee-f3d2-40e8-88fe-0132c8ca6020	b4160375-4a5d-4b8b-b3e0-94d459dcc861	15	2025-08-26 09:07:19.530067+00	2025-08-26 09:07:19.530067+00
6c7acebd-a6d8-4a50-97cc-be54403c06d9	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	5	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
b647c125-4ea1-47ba-b42b-15b36f93f155	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	6	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
ed17dec5-8a84-401e-97f0-53ddf317d308	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	7	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
4acfe06f-a9cd-4e21-b2fb-3efd12a0067e	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	8	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
55b94163-fd2f-450a-84e7-87df4f195e9b	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	9	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
347dad26-c0cf-4592-bfb8-3ea4305a6d79	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	10	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
1c6e7c40-e87d-4e83-bff1-6457c926226c	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	11	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
128b710d-d2ca-4748-834d-26d6e88616d5	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	12	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
471ccd4f-c40a-4379-b38d-4f63ec38ff95	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	13	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
d662c306-4178-4828-8934-4c193ce9b452	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	14	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
48531acf-5d40-4d39-be01-92d64bb96362	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	15	2025-08-27 12:32:16.213181+00	2025-08-27 12:32:16.213181+00
\.


--
-- Data for Name: chessboard_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chessboard_mapping (id, chessboard_id, cost_category_id, cost_type_id, location_id, created_at, updated_at, block_id) FROM stdin;
481e9ea1-23c2-4139-a305-18272003287b	dbe4f647-f47f-417d-87fa-412ffa230ed2	234	604	1	2025-08-14 10:52:34.672667+00	2025-08-14 10:52:34.672667+00	\N
5e5670f4-f2cb-49b8-ac94-5b870d7eedfa	1d616d5a-253f-48b5-8e2b-d7adb4085f6c	234	607	1	2025-08-14 07:07:42.310432+00	2025-08-14 07:07:42.310432+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
0e78f5d7-9fd9-4ccc-9e83-3987716ed981	6daba469-3956-45c5-ae33-0a314ea26dd8	240	631	2	2025-08-16 06:31:57.776943+00	2025-08-16 06:31:57.776943+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
4b6574c1-c107-4772-a837-dcdb861fa8a9	4008d3be-7fa4-4d15-81d7-58557337a06f	234	604	1	2025-08-14 10:51:17.779116+00	2025-08-14 10:51:17.779116+00	\N
e87e0dd5-1247-42ed-b0fe-589cd5f6b3a5	c44f5021-ecef-4bf3-af8f-613405bf65fe	240	631	2	2025-08-15 21:58:49.734159+00	2025-08-15 21:58:49.734159+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
0fc0c254-dc3a-416f-9575-268d4e3a0c5e	43cd8c94-7986-44f3-b3a4-792a7a57e091	234	604	1	2025-08-14 10:51:17.779116+00	2025-08-14 10:51:17.779116+00	\N
ef101bba-3655-466c-a0eb-beb2db828545	2b1077b7-804f-4db9-873f-ed0e204568c2	237	620	2	2025-08-14 06:40:32.723803+00	2025-08-14 06:40:32.723803+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
959fdb0d-2243-42e1-aced-bfba5202847b	175defaa-4b67-46fd-9589-c66f7345109e	235	617	2	2025-08-21 12:22:37.666996+00	2025-08-21 12:22:37.666996+00	\N
9048540a-6ea8-48ed-8978-215eef623feb	54d5f309-d3ba-4c6e-9829-a2d4dd43a18f	234	606	1	2025-08-13 15:08:57.122258+00	2025-08-13 15:08:57.122258+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
e31535a0-2895-4c35-af85-a407942f0358	0b4327c7-d26e-4deb-b605-495ff5686b2b	234	604	1	2025-08-13 14:30:33.43796+00	2025-08-13 14:30:33.43796+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
eb78a241-78be-4b74-ad0a-6799681e5da2	63e5ca16-8cb6-4358-941d-6812b00b1c44	234	604	1	2025-08-13 14:30:33.43796+00	2025-08-13 14:30:33.43796+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
2de3157c-86c8-4143-97e7-41622bfbf82d	f2d1f446-0d6a-42b7-85f1-c423b080014a	242	643	2	2025-08-26 08:38:39.337363+00	2025-08-26 08:38:39.337363+00	\N
a13a1cdb-234b-43dd-ac58-c21d8178ead4	7fb95665-4a07-424b-8d8e-260245f587de	240	630	2	2025-08-14 06:42:08.214842+00	2025-08-14 06:42:08.214842+00	b5837d17-e31c-4cf0-b45e-6c47343aaa13
7478068a-4591-4e2b-8041-5badbcf8bcfd	35e46480-72a3-4a28-80cb-be0aa159894d	240	630	2	2025-08-14 06:51:17.846443+00	2025-08-14 06:51:17.846443+00	b5837d17-e31c-4cf0-b45e-6c47343aaa13
b5a0a21e-279c-4982-84f5-12a864741027	b4160375-4a5d-4b8b-b3e0-94d459dcc861	242	644	2	2025-08-26 09:07:19.317887+00	2025-08-26 09:07:19.317887+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
70efa99b-cce1-40ba-85a1-ae852005a8ba	08c60efd-ab5a-4212-b56f-68dc9d04aaad	236	619	1	2025-08-13 14:55:17.138047+00	2025-08-13 14:55:17.138047+00	0e0f7096-788f-4927-8350-e17cb0320d53
9deeea82-c68d-4fe6-8c1a-e681891bd895	a7893ea6-63b7-4af4-932c-17785ab53f80	234	604	1	2025-08-14 09:06:14.295936+00	2025-08-14 09:06:14.295936+00	\N
d807212f-e9bc-456d-934f-059db472f482	bbe952d0-88ac-4c2c-b9d2-c5e3d1824cdf	234	604	1	2025-08-13 14:30:33.43796+00	2025-08-13 14:30:33.43796+00	\N
b4069a6e-4d5e-46d4-837b-852579ff7463	fbcd4668-4039-4802-9b9f-ad9a252cbf98	235	616	1	2025-08-14 09:05:22.516352+00	2025-08-14 09:05:22.516352+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
1445b101-4e46-4c97-874c-3ec1946e7e1d	b934ae15-0687-40b2-abd6-c5be161c9f96	235	616	1	2025-08-13 14:52:36.777387+00	2025-08-13 14:52:36.777387+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
31247163-7cfd-459e-b046-bc9a54b6f8fe	831b7173-dfb8-4093-a8d0-7d66c497ceb1	234	605	1	2025-08-14 10:31:37.077491+00	2025-08-14 10:31:37.077491+00	b5837d17-e31c-4cf0-b45e-6c47343aaa13
8592c175-83f8-4f6f-8952-4e13fa02158a	3a9dc7b0-9389-4bc0-8f8c-f4303e2786c6	234	605	1	2025-08-14 10:31:37.077491+00	2025-08-14 10:31:37.077491+00	b5837d17-e31c-4cf0-b45e-6c47343aaa13
34576ebc-6f2a-481a-ab9d-3dfcf01b816f	75ff4968-9429-48e9-86e6-96ffbc381f7d	240	630	2	2025-08-14 11:22:06.583768+00	2025-08-14 11:22:06.583768+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
4091a40f-55c3-4e4c-bdc9-cd7d6d11bb35	61459552-31b9-4342-a7b5-bf2191c5051e	240	630	2	2025-08-14 11:22:06.583768+00	2025-08-14 11:22:06.583768+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
e8ac5dbb-9c4a-4c10-8c7e-d70348373c21	baca8c81-3b84-4625-80e0-ef6e764c108a	240	631	2	2025-08-14 13:02:09.532269+00	2025-08-14 13:02:09.532269+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
55b0cfe1-a5f6-46de-a248-09ccaa5f8e16	9568e358-4c7b-493c-864a-20bb4a6f5df0	240	631	2	2025-08-14 13:02:09.532269+00	2025-08-14 13:02:09.532269+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
8748e8ba-1549-4a6e-8b6f-50841020ab5b	3a2bad6b-be01-4eb0-bfa2-7a4042d78d08	235	618	1	2025-08-13 19:38:04.281922+00	2025-08-13 19:38:04.281922+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
76b9e582-4441-404c-b29d-e49faf2d5481	060784fb-6ca9-4908-bd18-4e7c921a1f88	234	604	1	2025-08-15 12:29:10.305851+00	2025-08-15 12:29:10.305851+00	\N
d09f1e56-2fee-4669-a52e-99996555f488	e41fbde8-bf3b-4b80-aa43-251057eaa384	234	604	1	2025-08-15 12:29:10.305851+00	2025-08-15 12:29:10.305851+00	\N
d5468460-75f9-4de8-a5fc-94418ccf8e29	103bad71-ae87-4fc5-8c24-155b71749126	234	604	1	2025-08-14 12:04:43.412086+00	2025-08-14 12:04:43.412086+00	\N
bd66fa60-7b41-493e-ba59-645bbee60786	dda87bf3-8cd9-4a88-9e54-bd6b351a0213	242	643	2	2025-08-26 09:08:01.203858+00	2025-08-26 09:08:01.203858+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
28b9ddbb-570d-461c-8cc3-0a2c245ed7f8	69d9ee54-9fce-49e9-aae0-ec078b24da91	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
66c3c0c0-9fd1-49c8-a652-a979daf9ea22	e360a60b-8594-47c8-b170-cf8150e87b6d	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
30049b4c-d63c-4c1b-8d09-c2f957b96083	f5708d22-e60f-4b35-8a0d-f070b6568872	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
8cdedf0a-c298-45df-846f-dbd882b3ef55	eac7f515-af02-4f52-8615-bf901de475e1	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
25748590-a70a-4d3b-8250-c7bc89373c83	a23d8e8a-e8fc-4bda-8201-eacdd46b24cc	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
82b459b9-7c37-4445-8aad-e77e7ea327fd	9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	242	643	2	2025-08-27 12:32:15.853225+00	2025-08-27 12:32:15.853225+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
57367b7b-0846-4ea1-b6fa-7a96fead2fce	7e0de9b9-521c-4e37-ad7c-7bd32742b76d	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
bc52d528-6bff-45a2-9aa2-29281fd2efe8	7460d9d7-dc64-47fa-9da2-b1bfa1ba07a4	234	604	1	2025-08-15 12:31:28.58745+00	2025-08-15 12:31:28.58745+00	\N
31a9dc30-c885-43ef-a92b-596a6ac9e0b2	4be2f995-fd42-4994-86a2-16ad5313ad48	234	604	1	2025-08-15 15:10:44.029936+00	2025-08-15 15:10:44.029936+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
9e6693f9-ec7b-4d24-a478-2b84b9e9dafc	3bad03e2-d11a-4d19-bf12-cf600070d7d5	236	619	2	2025-08-15 15:10:44.029936+00	2025-08-15 15:10:44.029936+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
d2e849c9-8815-4d64-99d3-3252cc4500de	8b51be6b-a2c4-43c8-aa64-21412899256c	240	631	2	2025-08-14 14:26:47.059006+00	2025-08-14 14:26:47.059006+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
05719eb9-ae69-4c29-aa84-98789f2539f7	7dcbbd60-429d-4664-be97-4749b39bb307	240	631	2	2025-08-14 14:26:47.059006+00	2025-08-14 14:26:47.059006+00	c16b4784-73f0-4f1b-9401-a964d0a81aa0
4201a8d8-3d3d-47a5-a232-7723b736e964	150ca51a-60b7-41b8-9010-101b141d5876	240	630	2	2025-08-14 06:51:17.846443+00	2025-08-14 06:51:17.846443+00	b5837d17-e31c-4cf0-b45e-6c47343aaa13
\.


--
-- Data for Name: chessboard_rates_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chessboard_rates_mapping (chessboard_id, rate_id) FROM stdin;
f2d1f446-0d6a-42b7-85f1-c423b080014a	23b7300e-a128-4484-b96b-6ba783158745
b4160375-4a5d-4b8b-b3e0-94d459dcc861	e80c5bf1-2a98-4372-a896-cdea049d09e6
dda87bf3-8cd9-4a88-9e54-bd6b351a0213	fe746c26-ffa3-4def-946b-89458fc60a45
9a4f1523-34a6-4e76-bc03-7f4e2e2c4d9d	fe746c26-ffa3-4def-946b-89458fc60a45
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (comment_text, author_id, created_at, updated_at, id) FROM stdin;
123	\N	2025-08-20 08:02:01.991255+00	2025-08-20 08:02:01.991255+00	33dfc8c1-edec-4b16-8a22-ceae4765e1ec
234	\N	2025-08-20 08:02:02.464885+00	2025-08-20 08:02:02.464885+00	e65b31cf-2e48-4eed-8699-bca392c7cc64
коммент1	\N	2025-08-20 12:45:02.104789+00	2025-08-20 12:45:02.104789+00	b429e8c4-1080-4a8f-bbad-2cab4faf485f
коммент1	\N	2025-08-20 12:45:04.869248+00	2025-08-20 12:45:04.869248+00	0d5ab07e-118c-4fd6-894c-6ac7920feeec
коммент1	\N	2025-08-20 12:57:03.699905+00	2025-08-20 12:57:03.699905+00	47433fc3-4c26-4243-bb78-a708c93aeca0
ком1	\N	2025-08-20 14:19:06.588965+00	2025-08-20 14:19:06.588965+00	2d75cf36-4935-490e-85ce-5461f2cef9e8
\.


--
-- Data for Name: cost_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cost_categories (name, description, id, unit_id, created_at, updated_at, number) FROM stdin;
Организация строительной площадки	\N	234	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:31.43682+00	2025-08-13 12:01:31.43682+00	1
ЗЕМЛЯНЫЕ РАБОТЫ	\N	235	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-13 12:01:32.747107+00	2025-08-13 12:01:32.747107+00	2
ВОДООТВЕДЕНИЕ И ВОДОПОНИЖЕНИЕ	\N	236	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:33.107767+00	2025-08-13 12:01:33.107767+00	3
УСТРОЙСТВО КОТЛОВАНА	\N	237	c2e45369-70af-4049-b8d0-2a90d510c974	2025-08-13 12:01:33.279082+00	2025-08-13 12:01:33.279082+00	4
ГИДРОИЗОЛЯЦИОННЫЕ РАБОТЫ	\N	238	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:34.014317+00	2025-08-13 12:01:34.014317+00	5
УСТРОЙСТВО ВИБРОЗАЩИТЫ	\N	239	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:34.225815+00	2025-08-13 12:01:34.225815+00	6
МОНОЛИТНЫЕ РАБОТЫ	\N	240	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-13 12:01:34.40722+00	2025-08-13 12:01:34.40722+00	7
МЕТАЛЛИЧЕСКИЕ КОНСТРУКЦИИ	\N	241	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-13 12:01:35.710086+00	2025-08-13 12:01:35.710086+00	8
КЛАДОЧНЫЕ РАБОТЫ	\N	242	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-13 12:01:35.895313+00	2025-08-13 12:01:35.895313+00	9
КРОВЛЯ	\N	243	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:36.279942+00	2025-08-13 12:01:36.279942+00	10
ФАСАДНЫЕ РАБОТЫ	\N	244	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:36.457872+00	2025-08-13 12:01:36.457872+00	11
ОТДЕЛОЧНЫЕ РАБОТЫ	\N	245	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:37.713905+00	2025-08-13 12:01:37.713905+00	12
МОКАП	\N	246	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:42.263467+00	2025-08-13 12:01:42.263467+00	13
ДВЕРИ, ЛЮКИ, ВОРОТА	\N	247	ac24e31e-e04c-4ed2-b64a-4abb21152f80	2025-08-13 12:01:42.997199+00	2025-08-13 12:01:42.997199+00	14
ВИС / Механические инженерные системы	\N	248	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:44.642331+00	2025-08-13 12:01:44.642331+00	15
ВИС / Электрические системы	\N	249	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:45.672348+00	2025-08-13 12:01:45.672348+00	16
ВИС / Слаботочные системы, автоматика и диспетчеризация	\N	250	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:46.903026+00	2025-08-13 12:01:46.903026+00	17
ТЕХНОЛОГИЯ (ТХ)	\N	251	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:49.061998+00	2025-08-13 12:01:49.061998+00	18
НАРУЖНИЕ ВИС / Механические инженерные системы	\N	252	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:50.095651+00	2025-08-13 12:01:50.095651+00	19
НАРУЖНИЕ ВИС / Электрические системы	\N	253	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:50.994946+00	2025-08-13 12:01:50.994946+00	19
НАРУЖНИЕ ВИС / Слаботочные системы, автоматика и диспетчеризация	\N	254	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:51.204503+00	2025-08-13 12:01:51.204503+00	19
БЛАГОУСТРОЙСТВО	\N	255	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:51.403313+00	2025-08-13 12:01:51.403313+00	20
ОТДЕЛКА КВАРТИР MR BASE (предчистовая отделка)	\N	256	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:52.582512+00	2025-08-13 12:01:52.582512+00	21
ПРОЕКТНЫЕ РАБОТЫ	\N	257	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-13 12:01:53.968307+00	2025-08-13 12:01:53.968307+00	22
\.


--
-- Data for Name: detail_cost_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detail_cost_categories (id, name, unit_id, description, cost_category_id, location_id, created_at, updated_at) FROM stdin;
604	Ограждение строительной площадки	05d8126b-a759-4a2b-86c5-fab955492e50	\N	234	1	2025-08-13 12:01:31.549608+00	2025-08-13 12:01:31.549608+00
605	Пункт мойки колес	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	234	1	2025-08-13 12:01:31.639784+00	2025-08-13 12:01:31.639784+00
606	Бытовой городок	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	234	1	2025-08-13 12:01:31.764178+00	2025-08-13 12:01:31.764178+00
607	Дороги, покрытия	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:31.862292+00	2025-08-13 12:01:31.862292+00
608	Снос/демонтаж существующих зданий	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:31.960156+00	2025-08-13 12:01:31.960156+00
609	Демонтаж подземных фундаментов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:32.053637+00	2025-08-13 12:01:32.053637+00
610	Вырубка деревьев и кустарников	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:32.145607+00	2025-08-13 12:01:32.145607+00
611	Прочие работы (подсветка кранов, временная декоративные подсветка здания и тд)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:32.229246+00	2025-08-13 12:01:32.229246+00
612	Аренда ДГУ/КТПН + топливо +механик	99ecd3e0-7449-49c4-938a-1233aa3e7b98	\N	234	1	2025-08-13 12:01:32.342285+00	2025-08-13 12:01:32.342285+00
613	Аренда котельных, топливо трубопроводы, временные конвекторы на этажах, теплоноситель + механик	99ecd3e0-7449-49c4-938a-1233aa3e7b98	\N	234	1	2025-08-13 12:01:32.430787+00	2025-08-13 12:01:32.430787+00
614	Финишный клининг (фасада, светопрозрачки, отделки, покрытий благоустройства)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:32.522452+00	2025-08-13 12:01:32.522452+00
615	Временные сети	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	234	1	2025-08-13 12:01:32.619156+00	2025-08-13 12:01:32.619156+00
616	Разработка грунта (делить на классы)	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	235	2	2025-08-13 12:01:32.833718+00	2025-08-13 12:01:32.833718+00
617	Вывоз грунта с таллонами	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	235	2	2025-08-13 12:01:32.925926+00	2025-08-13 12:01:32.925926+00
618	Обратная засыпка (местный грунт, песок)	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	235	2	2025-08-13 12:01:33.022179+00	2025-08-13 12:01:33.022179+00
619	Водоотведение и водопонижение (физика+коммунальные платежи + эксплуатация)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	236	2	2025-08-13 12:01:33.192685+00	2025-08-13 12:01:33.192685+00
620	Шпунтовое ограждение	c2e45369-70af-4049-b8d0-2a90d510c974	\N	237	2	2025-08-13 12:01:33.376841+00	2025-08-13 12:01:33.376841+00
621	Распорная система	c2e45369-70af-4049-b8d0-2a90d510c974	\N	237	2	2025-08-13 12:01:33.474636+00	2025-08-13 12:01:33.474636+00
622	Демонтаж распорной системы	c2e45369-70af-4049-b8d0-2a90d510c974	\N	237	2	2025-08-13 12:01:33.567863+00	2025-08-13 12:01:33.567863+00
623	Грунтовые анкера	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	237	2	2025-08-13 12:01:33.657883+00	2025-08-13 12:01:33.657883+00
624	Стена в грунте + демонтаж форшахты (бентонит, каркас, бетон, вывоз грунта)	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	237	2	2025-08-13 12:01:33.744748+00	2025-08-13 12:01:33.744748+00
625	Свайные работы (стыковка, лидерное бурение, испытание свай)	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	237	2	2025-08-13 12:01:33.833624+00	2025-08-13 12:01:33.833624+00
626	Выравнивающая стенка	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	237	2	2025-08-13 12:01:33.927012+00	2025-08-13 12:01:33.927012+00
627	Гидроизоляция	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	238	2	2025-08-13 12:01:34.132015+00	2025-08-13 12:01:34.132015+00
628	Виброзащита	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	239	2	2025-08-13 12:01:34.315963+00	2025-08-13 12:01:34.315963+00
629	Бетонная подготовка	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.49986+00	2025-08-13 12:01:34.49986+00
630	Фундаментная плита	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.59236+00	2025-08-13 12:01:34.59236+00
631	Стены	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.684438+00	2025-08-13 12:01:34.684438+00
632	Пилоны и колонны	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.777481+00	2025-08-13 12:01:34.777481+00
633	Балки	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.867208+00	2025-08-13 12:01:34.867208+00
634	Плиты перекрытия / покрытия / разгрузочные	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:34.963538+00	2025-08-13 12:01:34.963538+00
635	Лестницы	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:35.056295+00	2025-08-13 12:01:35.056295+00
636	Рампа	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:35.155496+00	2025-08-13 12:01:35.155496+00
637	Фундаменты под оборудование	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:35.248034+00	2025-08-13 12:01:35.248034+00
638	Виброизоляция под оборудование	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	240	2	2025-08-13 12:01:35.342507+00	2025-08-13 12:01:35.342507+00
639	Сборные ж/б конструкции	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:35.441454+00	2025-08-13 12:01:35.441454+00
640	Фанера ламинированная	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	240	2	2025-08-13 12:01:35.527435+00	2025-08-13 12:01:35.527435+00
641	Башенные краны и подьемники (оператор, аренда, фундаменты. стартовые секции, пристежки (связи), ППР)	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	240	2	2025-08-13 12:01:35.621152+00	2025-08-13 12:01:35.621152+00
642	Металлоконструкции	b7eb7037-cb2b-4180-8a15-6e334e122e79	\N	241	2	2025-08-13 12:01:35.812254+00	2025-08-13 12:01:35.812254+00
643	Каменная кладка	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	242	2	2025-08-13 12:01:35.986041+00	2025-08-13 12:01:35.986041+00
644	Закладные детали кладки	b7eb7037-cb2b-4180-8a15-6e334e122e79	\N	242	2	2025-08-13 12:01:36.075636+00	2025-08-13 12:01:36.075636+00
645	Светопрозрачные стены внутри здания или парковки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	242	2	2025-08-13 12:01:36.17028+00	2025-08-13 12:01:36.17028+00
646	Кровельные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	243	2	2025-08-13 12:01:36.368115+00	2025-08-13 12:01:36.368115+00
647	Устройство мокрого фасада	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.550195+00	2025-08-13 12:01:36.550195+00
648	Облицовка НВФ	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.640455+00	2025-08-13 12:01:36.640455+00
649	Подсистема НВФ + утеплитель	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.731515+00	2025-08-13 12:01:36.731515+00
650	Светопрозрачные конструкции	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.822228+00	2025-08-13 12:01:36.822228+00
651	Фурнитура	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.914127+00	2025-08-13 12:01:36.914127+00
652	Профиль стойка-ригель	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:36.995073+00	2025-08-13 12:01:36.995073+00
653	Профиль ПВХ	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.083661+00	2025-08-13 12:01:37.083661+00
654	Тамбура (1-ые этажи и БКФН)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.167131+00	2025-08-13 12:01:37.167131+00
655	Двери наружные по фасаду (входные и БКФН, тамбурные двери)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.25009+00	2025-08-13 12:01:37.25009+00
656	Защита светопрозрачных конструкций	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.340245+00	2025-08-13 12:01:37.340245+00
657	СОФ	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.43141+00	2025-08-13 12:01:37.43141+00
658	Леса и люльки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.524499+00	2025-08-13 12:01:37.524499+00
659	Ограждения, козырьки, маркизы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	244	2	2025-08-13 12:01:37.615303+00	2025-08-13 12:01:37.615303+00
660	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	3	2025-08-13 12:01:37.797485+00	2025-08-13 12:01:37.797485+00
661	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	3	2025-08-13 12:01:37.884861+00	2025-08-13 12:01:37.884861+00
663	Навигация	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	3	2025-08-13 12:01:38.065991+00	2025-08-13 12:01:38.065991+00
662	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	3	2025-08-13 12:01:37.97244+00	2025-08-13 12:01:37.97244+00
666	Мебель ТХ	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	3	2025-08-13 12:01:38.33337+00	2025-08-13 12:01:38.33337+00
670	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	4	2025-08-13 12:01:38.698657+00	2025-08-13 12:01:38.698657+00
674	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	5	2025-08-13 12:01:39.052948+00	2025-08-13 12:01:39.052948+00
678	Навигация	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	6	2025-08-13 12:01:39.42664+00	2025-08-13 12:01:39.42664+00
682	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	8	2025-08-13 12:01:39.80685+00	2025-08-13 12:01:39.80685+00
686	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.174196+00	2025-08-13 12:01:40.174196+00
690	Декор	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	9	2025-08-13 12:01:40.523656+00	2025-08-13 12:01:40.523656+00
694	Освещение	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.907737+00	2025-08-13 12:01:40.907737+00
698	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	7	2025-08-13 12:01:41.265251+00	2025-08-13 12:01:41.265251+00
702	Навигация	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	7	2025-08-13 12:01:41.605927+00	2025-08-13 12:01:41.605927+00
706	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	10	2025-08-13 12:01:41.984047+00	2025-08-13 12:01:41.984047+00
709	Отделочные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	3	2025-08-13 12:01:42.36046+00	2025-08-13 12:01:42.36046+00
713	Отделочные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	11	2025-08-13 12:01:42.736519+00	2025-08-13 12:01:42.736519+00
716	Двери технических помещений	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	3	2025-08-13 12:01:43.086518+00	2025-08-13 12:01:43.086518+00
720	Двери лифтового холла	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.448175+00	2025-08-13 12:01:43.448175+00
724	Люки скрытые	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.820993+00	2025-08-13 12:01:43.820993+00
728	Потолочные лючки	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:44.195264+00	2025-08-13 12:01:44.195264+00
732	Потолочные лючки	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	9	2025-08-13 12:01:44.55594+00	2025-08-13 12:01:44.55594+00
735	Водоснабжение (ХВС, ГВС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:44.937501+00	2025-08-13 12:01:44.937501+00
739	Кондиционирование / Холодоснабжение + учтен огнезащитный короб	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.361043+00	2025-08-13 12:01:45.361043+00
742	Электрика - силовая. Огнезащита	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:45.767427+00	2025-08-13 12:01:45.767427+00
746	Электрика - силовая. Щитовое оборудование (с учетом комплексации щитов , ковриков)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.187947+00	2025-08-13 12:01:46.187947+00
750	Заземление и Молниезащита	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.606407+00	2025-08-13 12:01:46.606407+00
753	Охранно-защитная система (ОЗДС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.003985+00	2025-08-13 12:01:47.003985+00
757	Автоматизированный информационно-измерительная система коммерческого учета энергоресурсов (АИИСКУЭ)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.414445+00	2025-08-13 12:01:47.414445+00
761	Интернет (локальные вычислительные сети, ЛВС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.821417+00	2025-08-13 12:01:47.821417+00
765	Телефонизация (ТлССВ)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.229687+00	2025-08-13 12:01:48.229687+00
769	Система домофонной связи (СДС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.618957+00	2025-08-13 12:01:48.618957+00
776	Мусоропровод	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	251	1	2025-08-13 12:01:49.471428+00	2025-08-13 12:01:49.471428+00
780	Оборудование помещений для массовых мероприятий	92d5fd4d-eb25-4562-9292-a3defdcbb01e	\N	251	1	2025-08-13 12:01:49.874395+00	2025-08-13 12:01:49.874395+00
783	Водоотведение К2 (до первого колодца)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.294124+00	2025-08-13 12:01:50.294124+00
787	Канализация хоз-бытовая(включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.690462+00	2025-08-13 12:01:50.690462+00
790	Электрика - силовая(включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	253	1	2025-08-13 12:01:51.102553+00	2025-08-13 12:01:51.102553+00
792	Выемка за границами котлована	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	255	1	2025-08-13 12:01:51.506907+00	2025-08-13 12:01:51.506907+00
796	Финишные покрытия	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	255	1	2025-08-13 12:01:51.916341+00	2025-08-13 12:01:51.916341+00
800	Подпорные стены (в т.ч. габионы)	05d8126b-a759-4a2b-86c5-fab955492e50	\N	255	1	2025-08-13 12:01:52.302735+00	2025-08-13 12:01:52.302735+00
803	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:52.771865+00	2025-08-13 12:01:52.771865+00
807	ГКЛ перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.146669+00	2025-08-13 12:01:53.146669+00
811	Кондиционирование / Холодоснабжение	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.538629+00	2025-08-13 12:01:53.538629+00
818	Корректировка стадии П и повторная экспертиза	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.393003+00	2025-08-13 12:01:54.393003+00
664	ГКЛ перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	3	2025-08-13 12:01:38.153355+00	2025-08-13 12:01:38.153355+00
668	Водоотводные лотки паркинга	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	3	2025-08-13 12:01:38.511155+00	2025-08-13 12:01:38.511155+00
672	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	5	2025-08-13 12:01:38.872234+00	2025-08-13 12:01:38.872234+00
676	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	6	2025-08-13 12:01:39.241563+00	2025-08-13 12:01:39.241563+00
680	Защита МОП	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	6	2025-08-13 12:01:39.608156+00	2025-08-13 12:01:39.608156+00
684	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:39.994353+00	2025-08-13 12:01:39.994353+00
688	Почтовые ящики с конструкцией	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	9	2025-08-13 12:01:40.348102+00	2025-08-13 12:01:40.348102+00
692	Мобильные перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.707015+00	2025-08-13 12:01:40.707015+00
696	Мебель	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	9	2025-08-13 12:01:41.092363+00	2025-08-13 12:01:41.092363+00
700	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	7	2025-08-13 12:01:41.438051+00	2025-08-13 12:01:41.438051+00
704	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	10	2025-08-13 12:01:41.801329+00	2025-08-13 12:01:41.801329+00
708	Лестничные ограждения	05d8126b-a759-4a2b-86c5-fab955492e50	\N	245	10	2025-08-13 12:01:42.159558+00	2025-08-13 12:01:42.159558+00
711	Отделочные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	9	2025-08-13 12:01:42.562851+00	2025-08-13 12:01:42.562851+00
715	Благоустройство	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	2	2025-08-13 12:01:42.908639+00	2025-08-13 12:01:42.908639+00
718	Ворота	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	3	2025-08-13 12:01:43.268762+00	2025-08-13 12:01:43.268762+00
722	Двери квартирные	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.635069+00	2025-08-13 12:01:43.635069+00
726	Противопожарные шторы	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:44.018567+00	2025-08-13 12:01:44.018567+00
730	Двери входные	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	9	2025-08-13 12:01:44.375207+00	2025-08-13 12:01:44.375207+00
733	Вентиляция общеобменная	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:44.73491+00	2025-08-13 12:01:44.73491+00
737	Канализация ливневая	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.14914+00	2025-08-13 12:01:45.14914+00
741	ИТП	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.556218+00	2025-08-13 12:01:45.556218+00
744	Электрика - силовая. Лотки, кабельнесущие системы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:45.993139+00	2025-08-13 12:01:45.993139+00
748	Архитектурная подсветка	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.391978+00	2025-08-13 12:01:46.391978+00
752	ДГУ	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.7904+00	2025-08-13 12:01:46.7904+00
755	Автомат-я, диспетч-я и мониторинг: электроосв., вентил., кондиц., дренажа, контр. протечек	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.215204+00	2025-08-13 12:01:47.215204+00
759	Пожарная сигнализация (АПС, АУПС, ПС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.624581+00	2025-08-13 12:01:47.624581+00
763	Структурированная кабельная система (СКС) (подраздел)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.021187+00	2025-08-13 12:01:48.021187+00
767	Система контроля и управления доступом (СКУД)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.42265+00	2025-08-13 12:01:48.42265+00
771	Система тревожной сигнализации для МГН	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.823562+00	2025-08-13 12:01:48.823562+00
774	Вертикальный транспорт	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	251	1	2025-08-13 12:01:49.256318+00	2025-08-13 12:01:49.256318+00
778	Снегоплавильное оборудование	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	251	1	2025-08-13 12:01:49.683967+00	2025-08-13 12:01:49.683967+00
785	Тепловая сеть (до первого колодца)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.481034+00	2025-08-13 12:01:50.481034+00
789	Сети теплоснабжения(включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.902446+00	2025-08-13 12:01:50.902446+00
791	Интернет (локальные вычислительные сети, ЛВС)(включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	254	1	2025-08-13 12:01:51.301729+00	2025-08-13 12:01:51.301729+00
794	Металлоконструкции	05d8126b-a759-4a2b-86c5-fab955492e50	\N	255	1	2025-08-13 12:01:51.700957+00	2025-08-13 12:01:51.700957+00
798	Деревья	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	255	1	2025-08-13 12:01:52.100784+00	2025-08-13 12:01:52.100784+00
805	Кладка перегородок	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:52.95613+00	2025-08-13 12:01:52.95613+00
809	Водоснабжение (ХВС, ГВС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.356155+00	2025-08-13 12:01:53.356155+00
813	Электрика - освещение	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.747381+00	2025-08-13 12:01:53.747381+00
816	Разработка АИ на МОПы и паркинг	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.205928+00	2025-08-13 12:01:54.205928+00
820	Научно-техническое сопровождение строительства	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.580846+00	2025-08-13 12:01:54.580846+00
665	Мобильные перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	3	2025-08-13 12:01:38.241714+00	2025-08-13 12:01:38.241714+00
669	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	4	2025-08-13 12:01:38.601925+00	2025-08-13 12:01:38.601925+00
673	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	5	2025-08-13 12:01:38.962922+00	2025-08-13 12:01:38.962922+00
677	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	6	2025-08-13 12:01:39.338036+00	2025-08-13 12:01:39.338036+00
681	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	8	2025-08-13 12:01:39.711276+00	2025-08-13 12:01:39.711276+00
685	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.082877+00	2025-08-13 12:01:40.082877+00
689	Лифтовые порталы	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	9	2025-08-13 12:01:40.436862+00	2025-08-13 12:01:40.436862+00
693	Светопрозрачные перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.812501+00	2025-08-13 12:01:40.812501+00
697	Защита МОП	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:41.176927+00	2025-08-13 12:01:41.176927+00
701	Лифтовые порталы	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	7	2025-08-13 12:01:41.51989+00	2025-08-13 12:01:41.51989+00
705	Отделка стен	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	10	2025-08-13 12:01:41.890503+00	2025-08-13 12:01:41.890503+00
712	Отделочные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	7	2025-08-13 12:01:42.654756+00	2025-08-13 12:01:42.654756+00
719	Противопожарные шторы	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	3	2025-08-13 12:01:43.360326+00	2025-08-13 12:01:43.360326+00
723	Выход на кровлю	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.727736+00	2025-08-13 12:01:43.727736+00
727	Лючки в стенах	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:44.109329+00	2025-08-13 12:01:44.109329+00
731	Лючки в стенах	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	9	2025-08-13 12:01:44.467936+00	2025-08-13 12:01:44.467936+00
734	Вентиляция противодымная	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:44.840738+00	2025-08-13 12:01:44.840738+00
738	Пожаротушение	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.253951+00	2025-08-13 12:01:45.253951+00
745	Электрика - силовая. Шинопровод (кабельное соединение до шинопровода, коробки отбора мощности)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.090394+00	2025-08-13 12:01:46.090394+00
749	Освещение по благоустройству (кабель+освещение+закладные+фундаменты)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.489361+00	2025-08-13 12:01:46.489361+00
756	Система громкоговорящей связи в лифтах и лифтовых холлах	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.325498+00	2025-08-13 12:01:47.325498+00
760	Закладные детали сетей связи (ЗДСС, СКК)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.730553+00	2025-08-13 12:01:47.730553+00
764	Телевидение (эфирное, кабельное, спутниковое)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.132801+00	2025-08-13 12:01:48.132801+00
768	Система охранно-тревожной сигнализации (СОТС, ОС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.522325+00	2025-08-13 12:01:48.522325+00
772	Усиление сотовой связи	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.916896+00	2025-08-13 12:01:48.916896+00
775	Временные площадки, ограждение, овещение шахты временное, окрашивание приямка, лестница в приямок,  защита лифта	92d5fd4d-eb25-4562-9292-a3defdcbb01e	\N	251	1	2025-08-13 12:01:49.375264+00	2025-08-13 12:01:49.375264+00
779	Оборудование пищеблока	92d5fd4d-eb25-4562-9292-a3defdcbb01e	\N	251	1	2025-08-13 12:01:49.779084+00	2025-08-13 12:01:49.779084+00
782	Канализация К1 (до первого колодца)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.183209+00	2025-08-13 12:01:50.183209+00
786	Водоснабжение (включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.594637+00	2025-08-13 12:01:50.594637+00
795	Разгрузочные плиты	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	255	1	2025-08-13 12:01:51.807528+00	2025-08-13 12:01:51.807528+00
799	МАФ	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	255	1	2025-08-13 12:01:52.194369+00	2025-08-13 12:01:52.194369+00
802	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:52.678437+00	2025-08-13 12:01:52.678437+00
806	Закладные детали кладки	b7eb7037-cb2b-4180-8a15-6e334e122e79	\N	256	11	2025-08-13 12:01:53.049666+00	2025-08-13 12:01:53.049666+00
810	Канализация хоз-бытовая	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.449785+00	2025-08-13 12:01:53.449785+00
814	Слаботочные системы (включая устройства умного дома)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.838502+00	2025-08-13 12:01:53.838502+00
817	Разработка РД на отделку квартир	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.300471+00	2025-08-13 12:01:54.300471+00
821	ЗОС	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.674179+00	2025-08-13 12:01:54.674179+00
667	Деформационные швы (вертикальные и горизонтальные) финишное оформление	05d8126b-a759-4a2b-86c5-fab955492e50	\N	245	3	2025-08-13 12:01:38.421885+00	2025-08-13 12:01:38.421885+00
671	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	4	2025-08-13 12:01:38.782644+00	2025-08-13 12:01:38.782644+00
675	Отделка полов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	6	2025-08-13 12:01:39.158421+00	2025-08-13 12:01:39.158421+00
679	Лифтовые порталы	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	245	6	2025-08-13 12:01:39.517905+00	2025-08-13 12:01:39.517905+00
683	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	8	2025-08-13 12:01:39.896851+00	2025-08-13 12:01:39.896851+00
687	Навигация	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.262697+00	2025-08-13 12:01:40.262697+00
691	ГКЛ перегородки	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:40.612474+00	2025-08-13 12:01:40.612474+00
695	Сантехника	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	9	2025-08-13 12:01:41.00042+00	2025-08-13 12:01:41.00042+00
699	Отделка стен, колонн и откосов	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	7	2025-08-13 12:01:41.354384+00	2025-08-13 12:01:41.354384+00
703	Защита МОП	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	7	2025-08-13 12:01:41.710635+00	2025-08-13 12:01:41.710635+00
707	Отделка подоконников	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	245	10	2025-08-13 12:01:42.071287+00	2025-08-13 12:01:42.071287+00
710	Отделочные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	5	2025-08-13 12:01:42.451503+00	2025-08-13 12:01:42.451503+00
714	Фасадные работы	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	246	2	2025-08-13 12:01:42.829906+00	2025-08-13 12:01:42.829906+00
717	Двери кладовых	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	3	2025-08-13 12:01:43.180761+00	2025-08-13 12:01:43.180761+00
721	Двери лестничной клетки и тамбур-шлюза	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.541219+00	2025-08-13 12:01:43.541219+00
725	Двери технических помещений	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	7	2025-08-13 12:01:43.927432+00	2025-08-13 12:01:43.927432+00
729	Двери скрытого монтажа	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	247	9	2025-08-13 12:01:44.284286+00	2025-08-13 12:01:44.284286+00
736	Канализация хоз-бытовая	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.053211+00	2025-08-13 12:01:45.053211+00
740	Отопление	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	248	2	2025-08-13 12:01:45.456503+00	2025-08-13 12:01:45.456503+00
743	Электрика - силовая. Кабеля	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:45.863491+00	2025-08-13 12:01:45.863491+00
747	Электрика - освещение(кабель разводка) + аварийные блоки питания	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.293141+00	2025-08-13 12:01:46.293141+00
751	Трансформаторная подстанция (ТП)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	249	2	2025-08-13 12:01:46.695518+00	2025-08-13 12:01:46.695518+00
754	Система контроля загазованности	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.102826+00	2025-08-13 12:01:47.102826+00
758	Оповещение о пожаре (СОУЭ, АОП)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.529131+00	2025-08-13 12:01:47.529131+00
762	Радиофикация (РлТССВ)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:47.924568+00	2025-08-13 12:01:47.924568+00
766	Система видеонаблюдения (СОТ, СВБЛ, СВБД)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.3265+00	2025-08-13 12:01:48.3265+00
770	Система экстренной связи (СЭС)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	250	2	2025-08-13 12:01:48.735548+00	2025-08-13 12:01:48.735548+00
773	Технология дорожного движения и мойки колес	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	251	1	2025-08-13 12:01:49.168787+00	2025-08-13 12:01:49.168787+00
777	Водные объекты	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	251	1	2025-08-13 12:01:49.573757+00	2025-08-13 12:01:49.573757+00
781	Антитеррористическое оборудование	ac24e31e-e04c-4ed2-b64a-4abb21152f80	\N	251	1	2025-08-13 12:01:49.989194+00	2025-08-13 12:01:49.989194+00
784	Водоснабжение с водомерным узлом (до первого колодца)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.389757+00	2025-08-13 12:01:50.389757+00
788	Канализация ливневая(включая земляные работы)	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	252	1	2025-08-13 12:01:50.794018+00	2025-08-13 12:01:50.794018+00
793	Засыпка пазух до проектной отметки благоустройства	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	\N	255	1	2025-08-13 12:01:51.599305+00	2025-08-13 12:01:51.599305+00
797	Озеленение	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	255	1	2025-08-13 12:01:52.009737+00	2025-08-13 12:01:52.009737+00
801	Водоотводные лотки благоустройства	05d8126b-a759-4a2b-86c5-fab955492e50	\N	255	1	2025-08-13 12:01:52.455297+00	2025-08-13 12:01:52.455297+00
804	Отделка потолков	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:52.862939+00	2025-08-13 12:01:52.862939+00
808	Вентиляция общеобменная	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.245797+00	2025-08-13 12:01:53.245797+00
812	Электрика - силовая	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	256	11	2025-08-13 12:01:53.643077+00	2025-08-13 12:01:53.643077+00
815	Разработка РД (включая КМД на фасады) и авторский надзор	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.06379+00	2025-08-13 12:01:54.06379+00
819	Разработка РД на НИС	80ad8cd8-7fd1-402c-b536-7b1e16d71772	\N	257	2	2025-08-13 12:01:54.489067+00	2025-08-13 12:01:54.489067+00
\.


--
-- Data for Name: disk_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disk_settings (id, token, base_path, make_public, created_at, updated_at) FROM stdin;
76779a31-8ce4-49e4-9468-ac20e702a753	y0__xCt_ZauCBjo6jkguOabmxQwgpatrQjXoqSFrtcwOH0p1nsMxVQQ_Dmg0Q	disk:/blueprintflow	t	2025-08-26 16:07:23.136568+00	2025-08-26 16:07:23.136568+00
\.


--
-- Data for Name: documentation_file_paths; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentation_file_paths (id, version_id, file_path, created_at, updated_at) FROM stdin;
2c7d2715-1b73-45b2-b313-2a2bc3ec0400	7b62a552-7115-4c4b-a604-b318c5fe0c47	disk:/blueprintflow/Primavera_14/AR/ST26_01_14_AR0_AS_1_RD/ETOBASA.xlsx	2025-08-27 13:09:14.485573+00	2025-08-27 13:09:14.485573+00
a81d9191-f88d-4d74-8937-ce168280a9ee	7b62a552-7115-4c4b-a604-b318c5fe0c47	disk:/blueprintflow/Primavera_14/AR/ST26_01_14_AR0_AS_1_RD/165-1-2024-РД2-АИ1 (2).pdf	2025-08-27 13:09:14.485573+00	2025-08-27 13:09:14.485573+00
\.


--
-- Data for Name: documentation_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentation_tags (id, tag_number, name, created_at, updated_at) FROM stdin;
1	1	ПОС / Котлован / ГИ	2025-08-19 15:43:28.214067+00	2025-08-19 15:43:28.214067+00
2	2	КЖ	2025-08-19 15:44:13.950195+00	2025-08-19 15:44:13.950195+00
3	3	АР	2025-08-19 15:44:29.753578+00	2025-08-19 15:44:29.753578+00
4	4	ОВ/ВК	2025-08-19 15:44:51.025233+00	2025-08-19 15:44:51.025233+00
5	5	ЭОМ/СС	2025-08-19 15:45:02.326977+00	2025-08-19 15:45:02.326977+00
6	6	ТХ	2025-08-19 15:45:13.183335+00	2025-08-19 15:45:13.183335+00
\.


--
-- Data for Name: documentation_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentation_versions (version_number, issue_date, file_url, status, created_at, updated_at, documentation_id, id, local_files) FROM stdin;
1	2025-05-01	https://su10.bitrix24.ru/company/personal/user/647/tasks/task/view/18899/	not_filled	2025-08-21 09:32:15.64795+00	2025-08-21 09:32:15.64795+00	ec3d749d-8d35-49bb-a3a2-8a1b61f35d06	5296b35c-baee-4198-9a9c-21f9a1853f55	[]
1	2025-05-01	https://su10.bitrix24.ru/company/personal/user/647/tasks/task/view/18903/	not_filled	2025-08-21 09:32:16.133758+00	2025-08-21 09:32:16.133758+00	6a5d7eb8-ba66-4cc5-b8c9-93c6cda93271	5861590d-5545-4c6b-9598-1a7b61b21ab2	[]
1	2025-05-01	https://su10.bitrix24.ru/company/personal/user/647/tasks/task/view/18887/	not_filled	2025-08-21 09:32:16.644253+00	2025-08-21 09:32:16.644253+00	ff07f546-c05a-4c0c-972a-7aee401714a1	2a89a862-ec93-46a5-a727-83df0aedb682	[]
2	2025-05-30	https://su10.bitrix24.ru/company/personal/user/945/tasks/task/view/19977/	not_filled	2025-08-21 09:32:17.099289+00	2025-08-21 09:32:17.099289+00	ff07f546-c05a-4c0c-972a-7aee401714a1	57db01ee-9fc7-4ce3-8a95-fd850077daaa	[]
1	2025-05-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18969/	not_filled	2025-08-21 09:32:17.517671+00	2025-08-21 09:32:17.517671+00	958177af-f289-4c50-8317-b7e064cf2ac1	0b03df71-7845-4e1e-baaf-92c696490525	[]
2	2025-06-17	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20321/	not_filled	2025-08-21 09:32:17.907104+00	2025-08-21 09:32:17.907104+00	958177af-f289-4c50-8317-b7e064cf2ac1	034dd85c-a866-4843-bb5d-f989b52565ca	[]
1	2025-06-17	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20323/	not_filled	2025-08-21 09:32:18.294854+00	2025-08-21 09:32:18.294854+00	e8693dc2-101d-4d9e-ac9c-5bf7d9d075a0	f21dde26-f81e-4cd7-862a-240f3b189d37	[]
1	2025-01-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/14225/	not_filled	2025-08-25 15:26:33.150065+00	2025-08-25 15:26:33.150065+00	8dc51dec-082e-43cd-ad54-9b1de3599d00	2902374f-5110-4b74-be1a-ed9613d15b0c	[]
1	2025-07-01	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20749/	not_filled	2025-08-21 09:32:19.848459+00	2025-08-21 09:32:19.848459+00	1c7d2354-8f96-4a15-a401-deae1d27bb85	31cd9dd7-162e-464f-9066-2d600300b4f8	[]
1	2025-05-08	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19079/	not_filled	2025-08-21 09:32:20.201399+00	2025-08-21 09:32:20.201399+00	62eb11c4-915f-43e4-89f7-6c3068f9ef77	4ecbf816-da2f-4675-86f0-42bbeb4c000d	[]
1	2025-07-01	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20753/	not_filled	2025-08-21 09:32:20.57278+00	2025-08-21 09:32:20.57278+00	122f8545-cf1a-485e-856e-b7caf0a4501d	f3108e7c-f56c-4b84-b0d6-71539cd810a9	[]
1	2025-07-01	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20757/	not_filled	2025-08-21 09:32:20.964754+00	2025-08-21 09:32:20.964754+00	336fd416-423a-49d6-a12c-afb1afc2f55f	2232b40c-b09e-411a-95aa-df330213cfef	[]
1	2025-05-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18965/	not_filled	2025-08-21 09:32:21.357933+00	2025-08-21 09:32:21.357933+00	b4961ea6-874a-4bea-bb5a-c755adf4351d	b119cf5c-5eb4-466d-9b2f-ede52fc29c99	[]
1	2025-04-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18829/	not_filled	2025-08-21 09:32:21.959851+00	2025-08-21 09:32:21.959851+00	e84db261-4d46-4828-bf1a-7002b1f8c342	1782c826-d6f0-4142-846d-e77d45d46f9f	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22279/	not_filled	2025-08-21 09:32:22.321441+00	2025-08-21 09:32:22.321441+00	e84db261-4d46-4828-bf1a-7002b1f8c342	14a62dd9-7272-4609-b628-e11ee8358ae8	[]
1	2025-04-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18823/	not_filled	2025-08-21 09:32:22.703108+00	2025-08-21 09:32:22.703108+00	76452def-f7e8-456c-bd9b-8dfb0db0d30e	0532d84a-0f64-456d-9807-e3772b384f1d	[]
2	2025-08-16	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22749/	not_filled	2025-08-21 09:32:23.089613+00	2025-08-21 09:32:23.089613+00	76452def-f7e8-456c-bd9b-8dfb0db0d30e	ddb1f183-b185-4fa9-ad64-a96f97987aa1	[]
1	2025-04-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18835/	not_filled	2025-08-21 09:32:23.477174+00	2025-08-21 09:32:23.477174+00	2cd997ba-d211-43b4-988a-57dc26fc197d	619cca68-0afc-4870-bc5b-db67f1d53267	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22285/	not_filled	2025-08-21 09:32:23.853931+00	2025-08-21 09:32:23.853931+00	2cd997ba-d211-43b4-988a-57dc26fc197d	ab337a2e-06be-4bde-939f-3a3f91d7f391	[]
1	2025-04-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18839/	not_filled	2025-08-21 09:32:24.22731+00	2025-08-21 09:32:24.22731+00	0e3905d8-9af3-446f-8a75-9c35ed6cdfc0	3f8080a7-5a67-444b-8746-3f1e4a9e0100	[]
1	2025-05-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18961/	not_filled	2025-08-21 09:32:24.624254+00	2025-08-21 09:32:24.624254+00	aa9e3f3e-7793-4116-9456-97263d75a1c5	ca761a6c-c6ab-4c65-92f3-a547f1be09c0	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22291/	not_filled	2025-08-21 09:32:25.01057+00	2025-08-21 09:32:25.01057+00	aa9e3f3e-7793-4116-9456-97263d75a1c5	e5913c5b-6d23-49a5-8a27-249bd91dd5b7	[]
1	2025-04-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/18843/	not_filled	2025-08-21 09:32:25.41842+00	2025-08-21 09:32:25.41842+00	de703c63-895b-4117-a7a7-1dfc389f7cb5	f5c2b976-a541-415f-ab6c-d646a1f2a0a4	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22293/	not_filled	2025-08-21 09:32:25.788536+00	2025-08-21 09:32:25.788536+00	de703c63-895b-4117-a7a7-1dfc389f7cb5	3996d59e-e178-45db-a5ad-dc1bce1e329a	[]
3	2025-08-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22815/	not_filled	2025-08-21 09:32:26.157207+00	2025-08-21 09:32:26.157207+00	de703c63-895b-4117-a7a7-1dfc389f7cb5	95ca258d-6052-45df-855b-7618ee490b1b	[]
1	2025-06-13	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20301/	not_filled	2025-08-21 09:32:26.554738+00	2025-08-21 09:32:26.554738+00	91716c2b-9785-4268-b3c6-8df712438981	53c074b1-258b-408c-ad57-4fe2cda9da53	[]
2	2025-06-27	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20671/	not_filled	2025-08-21 09:32:26.943225+00	2025-08-21 09:32:26.943225+00	91716c2b-9785-4268-b3c6-8df712438981	9b05476e-842e-4c43-954f-3648f049c966	[]
3	2025-07-29	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22061/	not_filled	2025-08-21 09:32:27.339438+00	2025-08-21 09:32:27.339438+00	91716c2b-9785-4268-b3c6-8df712438981	f71a2870-97ea-48bf-890c-88acf2bb1ad4	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19767/	not_filled	2025-08-21 09:32:27.722816+00	2025-08-21 09:32:27.722816+00	b3540776-a64e-43a8-8e14-ec9a52fccd35	4b3cea1f-f9ca-43b1-99b9-b8b4f1c94f56	[]
2	2025-07-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21371/	not_filled	2025-08-21 09:32:28.075512+00	2025-08-21 09:32:28.075512+00	b3540776-a64e-43a8-8e14-ec9a52fccd35	0494f94c-5641-4bca-8b55-4b55626ba81d	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19771/	not_filled	2025-08-21 09:32:28.453512+00	2025-08-21 09:32:28.453512+00	370b50ca-b9f5-4430-848c-7afcd64ca6c0	8fe6911f-cb10-4115-8d3b-1ea5fc0b4950	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22273/	not_filled	2025-08-21 09:32:28.813309+00	2025-08-21 09:32:28.813309+00	370b50ca-b9f5-4430-848c-7afcd64ca6c0	11b8dc12-a931-435c-a26b-7f4c16641769	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19779/	not_filled	2025-08-21 09:32:29.188019+00	2025-08-21 09:32:29.188019+00	4a00e577-ff54-4471-a403-ef778bb11e6e	e0ec6c1c-a69d-4f2d-aafd-d9c97992798b	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22275/	not_filled	2025-08-21 09:32:29.570466+00	2025-08-21 09:32:29.570466+00	4a00e577-ff54-4471-a403-ef778bb11e6e	1927aee2-b09c-47dd-9c03-b889b3623951	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19775/	not_filled	2025-08-21 09:32:29.934705+00	2025-08-21 09:32:29.934705+00	788d290c-abc1-44f4-be93-bb72f26dad83	ce36e937-f0ce-4eae-b2b8-642bc248ec88	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22277/	not_filled	2025-08-21 09:32:30.356568+00	2025-08-21 09:32:30.356568+00	788d290c-abc1-44f4-be93-bb72f26dad83	a698c97a-14b4-40e8-869c-085d4da3a567	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21319/	not_filled	2025-08-21 09:32:30.720993+00	2025-08-21 09:32:30.720993+00	f3c1ac30-fecd-4179-9c2f-63d870f55251	1b8f98e2-96b7-4d0a-90d4-4d09d2f8becd	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21323/	not_filled	2025-08-21 09:32:31.077422+00	2025-08-21 09:32:31.077422+00	c7691b0e-1ad0-47c7-b64d-1fa765394ad0	1401385a-9214-48bc-b5ad-ff32b11f9fd1	[]
2	2025-07-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21373/	not_filled	2025-08-21 09:32:31.48301+00	2025-08-21 09:32:31.48301+00	c7691b0e-1ad0-47c7-b64d-1fa765394ad0	22af9f42-875f-4477-a087-3d282bedcf75	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19787/	not_filled	2025-08-21 09:32:31.83833+00	2025-08-21 09:32:31.83833+00	2c161a55-db1b-4450-a02f-68a1ad23d234	030ef1ef-18b3-4a75-aef5-97b18502eec8	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22281/	not_filled	2025-08-21 09:32:32.197455+00	2025-08-21 09:32:32.197455+00	2c161a55-db1b-4450-a02f-68a1ad23d234	64955b8e-119e-4fbd-8fe2-5fed46ebeabf	[]
1	2025-05-28	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19783/	not_filled	2025-08-21 09:32:32.565604+00	2025-08-21 09:32:32.565604+00	b3e96832-c6a2-47b1-b75b-41c5b9e44b58	079bbe65-d42c-4c3a-9c70-b14d8b572713	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22283/	not_filled	2025-08-21 09:32:32.944387+00	2025-08-21 09:32:32.944387+00	b3e96832-c6a2-47b1-b75b-41c5b9e44b58	46bd4c1e-6a75-4db1-8fa5-781674e649fe	[]
1	2025-06-03	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20067/	not_filled	2025-08-21 09:32:33.340538+00	2025-08-21 09:32:33.340538+00	e6ef80a1-ddf3-4d8d-a15a-be62755e795e	fccb7eb1-6714-4fd5-bc08-697702e2c989	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22287/	not_filled	2025-08-21 09:32:33.733788+00	2025-08-21 09:32:33.733788+00	e6ef80a1-ddf3-4d8d-a15a-be62755e795e	da90aa13-4d22-4fdd-be7e-72248032af7e	[]
1	2025-06-05	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/20213/	not_filled	2025-08-21 09:32:34.11307+00	2025-08-21 09:32:34.11307+00	f23c37ab-490b-4f48-99fa-1bcc2a0c5d65	e877ddd4-760f-4a10-a360-e778138e69b7	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21339/	not_filled	2025-08-21 09:32:36.257947+00	2025-08-21 09:32:36.257947+00	28625b76-6624-40d9-b62f-af18ac2b2de7	043547b8-b824-4fc1-922d-5dba4e470967	[]
1	2025-07-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21377/	not_filled	2025-08-21 09:32:38.377647+00	2025-08-21 09:32:38.377647+00	bd03d3fb-bdd5-456d-ac7c-3abae6e109bd	cc080518-b6db-449b-bf20-d6c655ba8c96	[]
1	2025-07-12	https://su10.bitrix24.ru/company/personal/user/947/tasks/task/view/21151/	not_filled	2025-08-25 15:26:33.68661+00	2025-08-25 15:26:33.68661+00	536a19c1-be2e-4b3c-b3a1-2a1746e61378	0c59bfda-4a4c-4daa-a056-0cf107bbdb6d	[]
1	2025-07-18	https://su10.bitrix24.ru/company/personal/user/895/tasks/task/view/21279/	not_filled	2025-08-25 15:26:34.647329+00	2025-08-25 15:26:34.647329+00	b344f9a7-5d2c-4883-bd97-02cc41771cf6	5d2887bf-ffec-43da-93b9-c4d44e9ffa91	[]
2	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22289/	not_filled	2025-08-21 09:32:34.666343+00	2025-08-21 09:32:34.666343+00	f23c37ab-490b-4f48-99fa-1bcc2a0c5d65	775e33dc-dea8-4a77-a89a-a698d0253af8	[]
2	2025-08-07	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22523/	not_filled	2025-08-21 09:32:36.788977+00	2025-08-21 09:32:36.788977+00	28625b76-6624-40d9-b62f-af18ac2b2de7	967e83d1-c453-4157-be5c-95844df3d5ef	[]
1	2025-08-07	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22527/	not_filled	2025-08-21 09:32:38.786867+00	2025-08-21 09:32:38.786867+00	9ad69277-9144-4844-b5a9-8af0592db8cc	df046eca-221d-4e9c-88cb-fbecc0207989	[]
1	2025-02-04	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/15135/	not_filled	2025-08-25 15:26:34.182608+00	2025-08-25 15:26:34.182608+00	69e9397f-34fe-4b91-84e6-7339f13c5c2d	9875a15f-0009-4428-a8a9-ee5593f0bd81	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21331/	not_filled	2025-08-21 09:32:35.028335+00	2025-08-21 09:32:35.028335+00	2a439585-672a-4ef7-8c93-d7a9c5ec8cce	15eb44c1-f05e-4187-86da-cb39577554c2	[]
3	2025-08-12	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22601/	not_filled	2025-08-21 09:32:37.219885+00	2025-08-21 09:32:37.219885+00	28625b76-6624-40d9-b62f-af18ac2b2de7	6b47bdf8-0bc0-4a50-b56b-95f2fd26adb2	[]
2	2025-08-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22813/	not_filled	2025-08-21 09:32:39.176252+00	2025-08-21 09:32:39.176252+00	9ad69277-9144-4844-b5a9-8af0592db8cc	6fdcb640-7d42-48b6-8715-5c42919fce49	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21327/	not_filled	2025-08-21 09:32:35.432943+00	2025-08-21 09:32:35.432943+00	fd4ac328-da06-4d5e-bd9d-a867da1d3002	ac54eaa1-487b-4cdc-8968-027905d0c911	[]
4	2025-08-16	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22747/	not_filled	2025-08-21 09:32:37.594921+00	2025-08-21 09:32:37.594921+00	28625b76-6624-40d9-b62f-af18ac2b2de7	a112c784-c3df-42b8-9980-e12a8e29eacb	[]
1	2025-05-08	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19075/	not_filled	2025-08-21 09:32:18.740209+00	2025-08-27 11:26:06.362682+00	3f19c800-5d2c-4ba0-8036-fe37bc21f6d5	92a5efb3-d0f9-42a3-9cfe-b8ff5a7409b8	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/21335/	not_filled	2025-08-21 09:32:35.866755+00	2025-08-21 09:32:35.866755+00	9374198d-6171-425d-b097-796d824c5b25	928dc22a-7ad1-4692-ab9d-dc22300b9590	[]
1	2025-05-30	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/19941/	not_filled	2025-08-21 09:32:37.990795+00	2025-08-21 09:32:37.990795+00	0d2b3ef0-f533-46b7-9421-0a8d9c4429b1	faefb477-007b-47fa-bd70-9cf7475aea2c	[]
1	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22271/	not_filled	2025-08-21 09:32:39.537102+00	2025-08-21 09:32:39.537102+00	3df6f514-8768-4282-b31c-79c4b5b65394	02d70795-5dd3-4004-9faf-2b1287e946a5	[]
1	2025-08-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22479/	not_filled	2025-08-21 09:32:39.922676+00	2025-08-21 09:32:39.922676+00	c3b9179e-74cc-407a-a5ee-a82a1f890ebe	bee4b9d5-75ca-4da1-ad37-ab78b5a3ba11	[]
2	2025-08-20	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22827/	not_filled	2025-08-21 09:32:40.375888+00	2025-08-21 09:32:40.375888+00	c3b9179e-74cc-407a-a5ee-a82a1f890ebe	c8667533-f207-4d32-b418-3759e72cfdc3	[]
1	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22297/	not_filled	2025-08-21 09:32:41.231764+00	2025-08-21 09:32:41.231764+00	650b14a9-07f2-4861-8637-091a8aa30398	5718bd2c-ea9d-42b0-8039-20760f7131f6	[]
1	2025-07-31	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22301/	not_filled	2025-08-21 09:32:41.635789+00	2025-08-21 09:32:41.635789+00	85733f4c-8afa-467b-ab16-038cfa6cf558	4b6362da-18ac-436d-9e42-a131c9584c0f	[]
2	2025-08-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22485/	not_filled	2025-08-21 09:32:42.156746+00	2025-08-21 09:32:42.156746+00	85733f4c-8afa-467b-ab16-038cfa6cf558	1686563c-9578-4516-90bb-d6e9193d9f8a	[]
1	2025-08-19	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22823/	not_filled	2025-08-21 09:32:42.514881+00	2025-08-21 09:32:42.514881+00	926738bf-c167-4625-8125-6f7327dcaef1	539e3c83-da72-432a-9ab6-aaf1358b1ef0	[]
1	2025-08-12	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22599/	not_filled	2025-08-21 09:32:42.891636+00	2025-08-21 09:32:42.891636+00	888fdda1-e306-4fa1-ac1a-4c61a66ebdac	52578446-19f2-4324-9a08-66e9f5817138	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22661/	not_filled	2025-08-21 09:32:43.297095+00	2025-08-21 09:32:43.297095+00	8865eec6-d7b2-446b-ba08-4dbdf32f40cc	184475e3-cf78-406a-aad7-53fb5627d3be	[]
1	2025-08-06	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22483/	not_filled	2025-08-21 09:32:43.687645+00	2025-08-21 09:32:43.687645+00	e43c2fb6-e302-4c80-b05c-a7a9a5d3a740	d81dbc39-0172-4470-8df7-d4aefe80c2df	[]
1	2025-08-20	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22835/	not_filled	2025-08-21 09:32:44.114987+00	2025-08-21 09:32:44.114987+00	42a7bee4-a86e-4dcd-8c71-cd2d79512dbb	0c181bf0-1250-451c-951e-7d7092f9e92e	[]
1	2025-06-20	https://su10.bitrix24.ru/company/personal/user/29/tasks/task/view/20433/	not_filled	2025-08-21 09:32:44.474499+00	2025-08-21 09:32:44.474499+00	2d22a0a2-ab12-4b9a-8334-b05b87110a2e	2d8c4354-8d24-488a-a281-f869f903a2bb	[]
1	2025-07-12	https://su10.bitrix24.ru/company/personal/user/947/tasks/task/view/21151/	not_filled	2025-08-22 07:28:26.501854+00	2025-08-22 08:17:20.6775+00	536a19c1-be2e-4b3c-b3a1-2a1746e61378	3c67bef4-bdce-4a50-934d-85085acf5f4e	[]
1	2025-07-12	https://su10.bitrix24.ru/company/personal/user/947/tasks/task/view/21155/	not_filled	2025-08-22 07:28:26.932957+00	2025-08-22 08:17:21.293405+00	b31ec789-9a2b-415a-ac22-bad844f443dc	9b8fda7f-1ccc-4cde-8c0b-292b628fc19a	[]
1	2025-06-04	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20131/	not_filled	2025-08-22 07:28:27.313929+00	2025-08-22 08:17:21.888883+00	ae4733f7-d46e-4d32-84af-d4e564208646	3d60f0f0-6ab1-4878-9c9e-998143c25f14	[]
4	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22695/	not_filled	2025-08-22 07:28:28.44816+00	2025-08-22 08:17:23.516028+00	ae4733f7-d46e-4d32-84af-d4e564208646	4294802e-f603-49c4-89bb-2fd4a0aae098	[]
2	2025-07-12	https://su10.bitrix24.ru/company/personal/user/947/tasks/task/view/21135/	not_filled	2025-08-22 07:28:29.226406+00	2025-08-22 08:17:24.658067+00	e734d241-860c-4f89-ac10-d20c9c6c5cac	e35b71d4-96f0-4974-a84d-ee25e3be4c0d	[]
1	2025-07-29	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22079/	not_filled	2025-08-22 07:28:30.397091+00	2025-08-22 08:17:26.047947+00	8b533c59-f839-4ec2-9ce2-d19df88337dd	5d00e86b-2ce8-47d6-939c-01dc0050a142	[]
1	2025-07-30	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22207/	not_filled	2025-08-22 07:28:31.127247+00	2025-08-22 08:17:27.264884+00	242a62fe-f985-49a2-88f0-de8ad166819d	8d40c346-ca63-4c03-8f99-e243650eab76	[]
1	2025-02-04	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/15135/	not_filled	2025-08-22 07:28:31.916127+00	2025-08-22 08:17:28.502094+00	69e9397f-34fe-4b91-84e6-7339f13c5c2d	45524342-5573-4d66-8795-35ca3957bb7d	[]
2	2025-02-22	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/15817/	not_filled	2025-08-22 07:28:32.272618+00	2025-08-22 08:17:29.306+00	69e9397f-34fe-4b91-84e6-7339f13c5c2d	9549e76c-dea1-4110-b576-83d11b0f2b02	[]
1	2025-02-04	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/15141/	not_filled	2025-08-22 07:28:32.995059+00	2025-08-22 08:17:30.497627+00	a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a	0c8b69cd-e4f7-496f-9704-f15dab63c9d2	[]
1	2025-02-16	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15501/	not_filled	2025-08-22 07:28:34.441251+00	2025-08-22 08:17:32.811717+00	ed16c046-d590-4169-898d-45b17e06ded0	0ad6dd89-5304-4a7d-8fe0-29d448fa6be4	[]
1	2025-02-16	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15497/	not_filled	2025-08-22 07:28:35.168174+00	2025-08-22 08:17:33.765475+00	098c4ba0-c037-4603-9ea1-3c21a93f3718	ee3dd3f6-03f0-483d-b212-b5f6694b9392	[]
1	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19259/	not_filled	2025-08-22 07:28:35.935735+00	2025-08-22 08:17:34.920001+00	d99591b3-7dfb-4de8-8bf1-d99d074f0ce5	9721c085-de67-45f5-b987-69bd7622ea2e	[]
1	2025-03-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17291/	not_filled	2025-08-22 07:28:36.686468+00	2025-08-22 08:17:36.069548+00	937745b4-b809-43ef-98a0-582eb7ce7135	c7872b00-390d-49ce-806e-800367c2e5ac	[]
2	2025-04-02	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17669/	not_filled	2025-08-22 07:28:37.051921+00	2025-08-22 08:17:36.757208+00	937745b4-b809-43ef-98a0-582eb7ce7135	75d6f639-1916-4113-bb86-694137ec4d77	[]
4	2025-04-19	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18297/	not_filled	2025-08-22 07:28:37.791672+00	2025-08-22 08:17:38.06073+00	937745b4-b809-43ef-98a0-582eb7ce7135	6cfe6998-53a6-4a23-9981-0113ff1ad558	[]
1	2025-02-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15911/	not_filled	2025-08-22 07:28:38.541255+00	2025-08-22 08:17:39.276799+00	3a769d69-c897-47db-bfc1-5fc54b893a47	7817268e-6e88-4549-a13e-7592078629db	[]
2	2025-03-04	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16375/	not_filled	2025-08-22 07:28:38.908043+00	2025-08-22 08:17:39.832971+00	3a769d69-c897-47db-bfc1-5fc54b893a47	2b4d4523-bdcc-427c-960f-abfae677f61e	[]
4	2025-05-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19467/	not_filled	2025-08-22 07:28:39.663819+00	2025-08-22 08:17:40.998469+00	3a769d69-c897-47db-bfc1-5fc54b893a47	6ca934cd-f2a9-4586-b24f-4533782e297a	[]
5	2025-05-29	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19811/	not_filled	2025-08-22 07:28:40.01641+00	2025-08-22 08:17:41.564056+00	3a769d69-c897-47db-bfc1-5fc54b893a47	9ee5a342-7f53-4b40-84fc-4caf25bcfd45	[]
1	2025-02-28	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16289/	not_filled	2025-08-22 07:28:40.718886+00	2025-08-22 08:17:42.74816+00	d119e7a5-3055-43c1-b39c-8bf9dad1a531	3d673cc6-658d-4b00-a6f3-12b39c9f87a0	[]
1	2025-03-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16805/	not_filled	2025-08-22 07:28:41.399144+00	2025-08-22 08:17:43.950615+00	0bfd342a-d2ec-471e-b994-88ed37b75b6c	4fe95932-ad26-4689-b40a-6ffa4103faf2	[]
2	2025-04-11	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18061/	not_filled	2025-08-22 07:28:41.93616+00	2025-08-22 08:17:44.597636+00	0bfd342a-d2ec-471e-b994-88ed37b75b6c	d27c3453-32ff-4ec4-8ba4-4b6307be40f5	[]
2	2025-05-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19347/	not_filled	2025-08-22 07:28:42.664855+00	2025-08-22 08:17:45.82796+00	3da7a8e8-e73d-4e78-a60a-e94bba3d8ed3	c22ab666-368d-4e50-85fd-f1f11ef4139a	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20493/	not_filled	2025-08-22 07:28:43.342762+00	2025-08-22 08:17:47.049324+00	f1d98d56-134c-41d7-b627-cf145d6042c3	7a0c2ca0-28ed-4e07-893a-db4599376679	[]
2	2025-06-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20601/	not_filled	2025-08-22 07:28:43.699629+00	2025-08-22 08:17:47.665847+00	f1d98d56-134c-41d7-b627-cf145d6042c3	59469bff-f0f5-446c-b9e3-d365d14fcbfc	[]
4	2025-07-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21033/	not_filled	2025-08-22 07:28:44.381631+00	2025-08-22 08:17:48.822424+00	f1d98d56-134c-41d7-b627-cf145d6042c3	845a6d60-c69f-48f5-ac53-094b1f6fa493	[]
2	2025-07-02	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20827/	not_filled	2025-08-22 07:28:45.068865+00	2025-08-22 08:17:49.995875+00	3894bb58-3102-42b8-a210-0906ece8f431	4fb30d45-f11f-4db9-9149-6aa5bd4e15c7	[]
3	2025-07-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21175/	not_filled	2025-08-22 07:28:45.410952+00	2025-08-22 08:17:50.576308+00	3894bb58-3102-42b8-a210-0906ece8f431	c7414130-e51a-4ee2-afc0-379baeb87d7a	[]
2	2025-07-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20725/	not_filled	2025-08-22 07:28:46.141826+00	2025-08-22 08:17:51.823639+00	17e81e5d-bdc1-4b08-81bb-cfd1ee5179a3	50999738-fb44-4ef9-89f5-41fff230d6ff	[]
3	2025-07-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21037/	not_filled	2025-08-22 07:28:46.49377+00	2025-08-22 08:17:52.434758+00	17e81e5d-bdc1-4b08-81bb-cfd1ee5179a3	5bfed41e-5253-43ca-acb4-0879edf3d688	[]
2	2025-07-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22037/	not_filled	2025-08-22 07:28:48.195498+00	2025-08-22 08:17:55.483223+00	3d99658c-d013-4598-beb3-2136eb9c4548	83497f3d-817e-438e-9702-4ad1795bbb90	[]
1	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22387/	not_filled	2025-08-22 07:28:49.917285+00	2025-08-22 08:17:58.565777+00	f2bf8b78-faf9-41a9-8539-7b0765f913f5	fa9bc491-9058-42f1-9a5b-be16f46f0274	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22675/	not_filled	2025-08-22 07:28:51.746803+00	2025-08-22 08:18:01.695009+00	b6111a7f-8322-41ad-82f2-d9cae09c7f9b	660396c8-ad36-41ff-8546-f5776f366634	[]
1	2025-04-02	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17663/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=17663&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:28:53.480762+00	2025-08-22 08:18:04.758144+00	1901815b-66c7-465a-a8bb-ad5aa8eff42d	74376713-c1b2-45ad-8fc5-0818a94718df	[]
2	2025-05-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19351/	not_filled	2025-08-22 07:28:55.298653+00	2025-08-22 08:18:07.802959+00	8fbd85ce-682a-4e7a-8239-d6d385d7e85b	c3421616-28fd-43c8-9505-7d9b3c0d7b11	[]
1	2025-06-19	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20409/	not_filled	2025-08-22 07:28:57.063825+00	2025-08-22 08:18:10.794099+00	d9d67333-5aab-492c-80a3-c90f7e7edc19	8cb7b488-179c-477e-94e5-e3abce067435	[]
2	2025-08-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22551/	not_filled	2025-08-22 07:28:58.878423+00	2025-08-22 08:18:15.013811+00	4e9af931-8bf7-4f99-a215-d8883b17a691	9c502988-a0fa-4947-b5d6-a9ca3fa3fee1	[]
1	2025-03-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17299/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=17299&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:29:00.659538+00	2025-08-22 08:18:18.032217+00	bacf8633-8d7d-4d5d-bd69-c799b13c4a02	29d0be8f-083d-42d1-b721-b940ddf0b831	[]
2	2025-05-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19497/?any=group%2F125%2Ftasks%2Ftask%2Fview%2F19497%2F	not_filled	2025-08-22 07:29:02.464835+00	2025-08-22 08:18:21.051746+00	806daac2-b7b5-4ce2-b852-95d2b3130475	6cf83dc7-c4b7-4fcf-8c60-803b9f5ec9bc	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20447/	not_filled	2025-08-22 07:29:04.542969+00	2025-08-22 08:18:24.168766+00	6124c63f-4cae-43ef-ab34-95a50ddbf275	5635fcaf-310a-420d-9aa5-372da94eaaf9	[]
3	2025-07-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20727/	not_filled	2025-08-22 07:29:06.401111+00	2025-08-22 08:18:26.914145+00	9d43afc4-e71a-4ccf-916a-8f85689587bf	285ce928-66fe-4f3e-aad4-3ac591828fbe	[]
1	2025-07-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21173/	not_filled	2025-08-22 07:28:46.825185+00	2025-08-22 08:17:53.050024+00	4553f0c2-ce2c-434c-9518-019553b62715	479714a9-c4d2-4c80-a267-da7de13a479e	[]
3	2025-08-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22441/	not_filled	2025-08-22 07:28:48.531542+00	2025-08-22 08:17:56.109175+00	3d99658c-d013-4598-beb3-2136eb9c4548	b62fa27c-9cb1-4ff3-9ecc-2ac7e1a8deff	[]
1	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22391/	not_filled	2025-08-22 07:28:50.355096+00	2025-08-22 08:17:59.22508+00	df45486e-d998-4540-93df-4ab7e9c8d9cd	21548fbb-db4f-42ca-8f82-a0965141efde	[]
1	2025-04-16	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18211/	not_filled	2025-08-22 07:28:52.12498+00	2025-08-22 08:18:02.30398+00	a1e52472-dba3-498d-ad64-57ba3776876a	0cf47924-b94c-4c57-9991-a66f828f298a	[]
2	2025-04-16	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18213/	not_filled	2025-08-22 07:28:53.840143+00	2025-08-22 08:18:05.382548+00	1901815b-66c7-465a-a8bb-ad5aa8eff42d	ffadc36d-6252-4d97-9636-d6ec301f2ffd	[]
3	2025-05-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19539/	not_filled	2025-08-22 07:28:55.641691+00	2025-08-22 08:18:08.367044+00	8fbd85ce-682a-4e7a-8239-d6d385d7e85b	ca9665d3-0741-440c-a600-c0b25d72ad41	[]
2	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20503/	not_filled	2025-08-22 07:28:57.435638+00	2025-08-22 08:18:11.452209+00	d9d67333-5aab-492c-80a3-c90f7e7edc19	1cfc724b-ebc0-474e-971a-6e96ca938a04	[]
1	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22363/	not_filled	2025-08-22 07:28:59.221622+00	2025-08-22 08:18:15.60707+00	648dba5f-0a84-4782-800a-1e03955c9136	fefc8544-6777-4357-869a-c03541db661e	[]
2	2025-05-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18907/	not_filled	2025-08-22 07:29:01.035364+00	2025-08-22 08:18:18.629113+00	bacf8633-8d7d-4d5d-bd69-c799b13c4a02	b27e38d9-02c7-4829-9750-c0454f8de0ae	[]
1	2025-05-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19071/	not_filled	2025-08-22 07:29:02.806756+00	2025-08-22 08:18:21.72734+00	48ffc696-b127-4121-8d41-72e63ce27922	181d400a-5aea-48a8-a84a-ac8a0ad6ecc5	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20451/	not_filled	2025-08-22 07:29:04.91551+00	2025-08-22 08:18:24.757743+00	2bb0b7a5-82c7-491f-b9d9-d2f874a00f85	89a54c7a-6611-4192-85ad-cd6d9b479f0e	[]
1	2025-06-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20613/	not_filled	2025-08-22 07:29:06.749357+00	2025-08-22 08:18:27.506456+00	c116b14a-68a0-4ead-aa87-77dee7ecc984	22629e3e-e9a7-4fc2-9d33-1888e982d49b	[]
1	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21859/	not_filled	2025-08-22 07:28:47.163968+00	2025-08-22 08:17:53.65545+00	39a2d76a-bbb9-4314-831a-d78603b8bb0f	1e2cd06d-d14f-44be-9bfb-4323c58ff021	[]
1	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21871/	not_filled	2025-08-22 07:28:48.877787+00	2025-08-22 08:17:56.780731+00	bca2c0bc-a4c8-410e-bbad-3dafe1202c8d	cdabc224-6ee7-4a20-bdc8-9ca17a7f9f7c	[]
2	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22689/	not_filled	2025-08-22 07:28:50.709081+00	2025-08-22 08:17:59.825476+00	df45486e-d998-4540-93df-4ab7e9c8d9cd	5d71b37e-7043-44a7-96ba-5c8a8f303417	[]
1	2025-04-11	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18071/	not_filled	2025-08-22 07:28:52.449392+00	2025-08-22 08:18:02.909143+00	afd8017a-6d65-4432-a645-9c9c735bc6d6	2cc22364-a5de-4d05-9b77-120e184ae75a	[]
3	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19293/	not_filled	2025-08-22 07:28:54.224613+00	2025-08-22 08:18:05.986943+00	1901815b-66c7-465a-a8bb-ad5aa8eff42d	2dd4fa4b-1dc0-4242-afda-b98e7f6e59b2	[]
1	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19301/	not_filled	2025-08-22 07:28:55.9905+00	2025-08-22 08:18:08.964492+00	913c05cc-d6f0-4b07-8490-b1e18c1bae67	8b3afc7c-2b94-44a3-ac2d-a28269055b8d	[]
1	2025-07-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22027/	not_filled	2025-08-22 07:28:57.787266+00	2025-08-22 08:18:12.402109+00	852f21db-e276-45ff-b7ae-574dc9f723db	19b4dcf6-3b5a-4932-a9aa-d748014c77b6	[]
1	2025-05-31	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19993/	not_filled	2025-08-22 07:28:59.587267+00	2025-08-22 08:18:16.225077+00	6629caf2-f9b1-431c-822f-2d1eb2d4c097	cd217198-0a72-409e-9c5c-40c0300ea8af	[]
1	2025-05-07	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19037/	not_filled	2025-08-22 07:29:01.37619+00	2025-08-22 08:18:19.245956+00	e9e5f6d6-fec8-4982-9b29-9540a1b6529e	e42908e9-9388-49f9-b65e-443b9bd31dd6	[]
2	2025-05-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19353/	not_filled	2025-08-22 07:29:03.149308+00	2025-08-22 08:18:22.332775+00	48ffc696-b127-4121-8d41-72e63ce27922	6c3e4f0d-da1c-4ecd-9466-6ef7f083e74b	[]
1	2025-06-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20605/	not_filled	2025-08-22 07:29:05.260296+00	2025-08-22 08:18:25.371438+00	e6eedd46-b64a-4278-9d6f-b7eb5d7a4123	578eaf83-31e1-4720-b4e3-3ec3c95287a9	[]
1	2025-07-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20731/	not_filled	2025-08-22 07:29:07.105543+00	2025-08-22 08:18:28.124642+00	32656b43-1b53-44ae-b2e2-81befd9cd7a5	65678175-4fe3-430b-88c9-90bbb3193dd3	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21311/	not_filled	2025-08-22 07:28:47.500907+00	2025-08-22 08:17:54.264559+00	10f1d962-b920-4f8d-a675-84458469a4a0	2f20ebf5-5339-414f-8334-f8bd862b70d5	[]
2	2025-08-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22565/	not_filled	2025-08-22 07:28:49.223854+00	2025-08-22 08:17:57.381528+00	bca2c0bc-a4c8-410e-bbad-3dafe1202c8d	02aa966a-b735-4aa3-b1df-03775ce5544b	[]
1	2025-08-07	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22549/	not_filled	2025-08-22 07:28:51.086105+00	2025-08-22 08:18:00.43108+00	db6f62f5-676d-491f-9a45-d5743fc245f3	23b812ad-f098-4540-82fd-eae0e07b330f	[]
2	2025-04-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18285/	not_filled	2025-08-22 07:28:52.813317+00	2025-08-22 08:18:03.492961+00	afd8017a-6d65-4432-a645-9c9c735bc6d6	c9bcdf10-c926-4893-81c9-391b7c455e9b	[]
4	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19295/	not_filled	2025-08-22 07:28:54.561338+00	2025-08-22 08:18:06.606645+00	1901815b-66c7-465a-a8bb-ad5aa8eff42d	42179e6b-9fcb-4bcc-90c7-b85dcb47f225	[]
2	2025-05-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19455/	not_filled	2025-08-22 07:28:56.323086+00	2025-08-22 08:18:09.582739+00	913c05cc-d6f0-4b07-8490-b1e18c1bae67	f565c75d-5c1d-437d-8d70-ec060bec48cc	[]
2	2025-08-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22431/	not_filled	2025-08-22 07:28:58.136479+00	2025-08-22 08:18:13.69727+00	852f21db-e276-45ff-b7ae-574dc9f723db	6333d7d2-466e-4c03-8b8a-7bea9695fb95	[]
1	2025-03-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17295/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=17295&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:28:59.941689+00	2025-08-22 08:18:16.854012+00	a8768648-7398-4c2a-9179-4e8ac3ae3dc8	20c41a30-a653-44c9-b261-f597cb9d22d7	[]
2	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19311/	not_filled	2025-08-22 07:29:01.744207+00	2025-08-22 08:18:19.840891+00	e9e5f6d6-fec8-4982-9b29-9540a1b6529e	93a9eae4-6bfb-434f-8b1e-2583e637843b	[]
3	2025-05-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19541/	not_filled	2025-08-22 07:29:03.515239+00	2025-08-22 08:18:22.940401+00	48ffc696-b127-4121-8d41-72e63ce27922	a4cab8d7-d880-40d6-92cb-e1827a95b66f	[]
2	2025-07-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21137/	not_filled	2025-08-22 07:29:07.440604+00	2025-08-22 08:18:28.747036+00	32656b43-1b53-44ae-b2e2-81befd9cd7a5	9c614da0-ed92-4a0f-9474-f6968530f81a	[]
1	2025-01-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/14225/	not_filled	2025-08-22 07:28:25.028578+00	2025-08-22 08:17:18.727006+00	8dc51dec-082e-43cd-ad54-9b1de3599d00	972d3248-51e3-40bc-9fdd-2f4e52e78c26	[]
1	2025-02-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15373/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=15373&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:28:25.538273+00	2025-08-22 08:17:19.366813+00	82fb8525-b47b-4f21-84c3-5ea5ac30ac51	7349203b-49cb-4e95-ac64-7c3c65c6f131	[]
1	2025-02-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15365/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=15365&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:28:25.976259+00	2025-08-22 08:17:20.012681+00	e2393cc8-d3fe-4e8e-b2aa-e7014222dc9e	e1c41a51-624a-4ac1-9156-ed51cec579da	[]
3	2025-07-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21445/	not_filled	2025-08-22 07:28:28.076297+00	2025-08-22 08:17:22.950137+00	ae4733f7-d46e-4d32-84af-d4e564208646	97b348d2-4597-4d61-899d-6ec3495491b7	[]
1	2025-06-04	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20137/	not_filled	2025-08-22 07:28:28.872611+00	2025-08-22 08:17:24.095962+00	e734d241-860c-4f89-ac10-d20c9c6c5cac	cae3596f-406f-401e-ac8f-4cd8a8ff9210	[]
1	2025-07-30	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22203/	not_filled	2025-08-22 07:28:30.760579+00	2025-08-22 08:17:26.694332+00	0b710cac-6ff4-4b3f-8597-eba3dbdf2730	25da50fe-e9c1-42ca-b4b3-8134d0c1e310	[]
2	2025-08-20	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22837/	not_filled	2025-08-22 07:28:31.490372+00	2025-08-22 08:17:27.835859+00	242a62fe-f985-49a2-88f0-de8ad166819d	0eec1856-1c2b-47d9-a844-2f32e9eb03c9	[]
2	2025-02-22	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/15815/	not_filled	2025-08-22 07:28:33.358133+00	2025-08-22 08:17:31.114068+00	a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a	7e245274-4bf8-48c0-9f71-fbc9cfa5c89d	[]
1	2025-02-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/15369/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=15369&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:28:34.068524+00	2025-08-22 08:17:32.252513+00	51c84359-43fc-4caf-b1e0-51ee514a1627	2b5d43b8-bb6e-4199-a7e4-12cdd4d381db	[]
2	2025-03-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16939/	not_filled	2025-08-22 07:28:35.568673+00	2025-08-22 08:17:34.323258+00	098c4ba0-c037-4603-9ea1-3c21a93f3718	37801599-d1a2-4002-b602-701531797410	[]
2	2025-06-20	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20417/	not_filled	2025-08-22 07:28:36.295165+00	2025-08-22 08:17:35.503708+00	d99591b3-7dfb-4de8-8bf1-d99d074f0ce5	6afd9d17-3484-4440-98d1-c5cf1733a48b	[]
3	2025-04-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17839/	not_filled	2025-08-22 07:28:37.402348+00	2025-08-22 08:17:37.34131+00	937745b4-b809-43ef-98a0-582eb7ce7135	068c5d3a-e7d4-4017-9403-7a095104fed9	[]
5	2025-06-20	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20421/	not_filled	2025-08-22 07:28:38.160165+00	2025-08-22 08:17:38.700634+00	937745b4-b809-43ef-98a0-582eb7ce7135	e183905d-120e-4379-b0c6-ced7db683474	[]
3	2025-03-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17137/	not_filled	2025-08-22 07:28:39.291635+00	2025-08-22 08:17:40.424424+00	3a769d69-c897-47db-bfc1-5fc54b893a47	868cbaee-79f1-4506-9547-7148a8bfa970	[]
6	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19813/	not_filled	2025-08-22 07:28:40.378407+00	2025-08-22 08:17:42.149342+00	3a769d69-c897-47db-bfc1-5fc54b893a47	bfb923b3-f65a-44f4-9ee9-44c41df1430c	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22693/	not_filled	2025-08-22 07:28:49.555985+00	2025-08-22 08:17:57.970716+00	d3e02784-6af0-4efa-b33c-274bcfe33dc4	ca6bf2a1-1c19-4f8d-94c7-a4985ec9c072	[]
1	2025-05-06	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18975/	not_filled	2025-08-22 07:28:53.145506+00	2025-08-22 08:18:04.141224+00	24aaa6e0-1a3c-4c8a-94b0-96684d646b36	57e1e126-1bd8-4526-a782-fdb2144b7114	[]
1	2025-05-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19305/	not_filled	2025-08-22 07:28:54.922447+00	2025-08-22 08:18:07.212447+00	8fbd85ce-682a-4e7a-8239-d6d385d7e85b	923217f5-4eac-45cf-a382-3eb72d98b594	[]
1	2025-07-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22031/	not_filled	2025-08-22 07:28:58.52348+00	2025-08-22 08:18:14.421122+00	4e9af931-8bf7-4f99-a215-d8883b17a691	66349b2d-2300-425d-b144-b74a8115a4f8	[]
1	2025-05-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19465/	not_filled	2025-08-22 07:29:04.199568+00	2025-08-22 08:18:23.550636+00	e6f22d45-bcc3-48bb-a26b-5a348f993321	1dcc646d-edfe-4ae7-a685-6c6c81baf97f	[]
2	2025-06-27	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20673/	not_filled	2025-08-22 07:29:05.983413+00	2025-08-22 08:18:26.332043+00	9d43afc4-e71a-4ccf-916a-8f85689587bf	19e2ffcf-164a-459a-b2df-b6bb08656fe1	[]
1	2025-07-03	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20903/	not_filled	2025-08-22 07:29:07.792317+00	2025-08-22 08:18:29.407248+00	5ecd96f4-75ab-481f-99b7-3b9c23a5fb28	25c64251-ceeb-4f25-b14f-fc9b4ba01c81	[]
2	2025-07-15	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21169/	not_filled	2025-08-22 07:29:08.520084+00	2025-08-22 08:18:30.652041+00	0c19a57a-b96e-4dc5-9f84-a7a816ccd4fc	676d7cf6-44c3-4dea-a354-c488b62b93bc	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21303/	not_filled	2025-08-22 07:29:08.865642+00	2025-08-22 08:18:31.264937+00	e7c92fe3-bb13-4214-bfe9-725070f9c2d5	655cffaf-3066-4e11-b3e5-15d4331fb919	[]
2	2025-07-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22035/	not_filled	2025-08-22 07:29:09.544622+00	2025-08-22 08:18:32.609053+00	7b045b20-bf2d-4481-ab1a-0bbe2b11a30a	b2053879-5b7e-42e6-b349-08dfaf72c1ab	[]
1	2025-08-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22555/	not_filled	2025-08-22 07:29:10.245869+00	2025-08-22 08:18:33.866241+00	ed6a8820-be59-4e7e-93f7-9864827e96c7	8f948d8b-e4bf-438e-8604-884d7d81087a	[]
1	2025-06-17	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20351/	not_filled	2025-08-22 07:29:10.586646+00	2025-08-22 08:18:34.450826+00	7c6df5bb-a0d1-4ea1-b735-9d8bd6db3cba	959517b5-6bf8-4b5f-94fb-0d10451ee45d	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20511/	not_filled	2025-08-22 07:29:11.324816+00	2025-08-22 08:18:35.586218+00	44359f67-fe61-43d9-90db-8752e2e48560	b1110dca-1265-4eed-ad0e-14031f1cfb0e	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20515/	not_filled	2025-08-22 07:29:12.026223+00	2025-08-22 08:18:36.745451+00	776191f4-9508-429f-b3f2-48ef5502ad86	4ccd7284-2a25-4a14-992a-2824ab49b37f	[]
1	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21855/	not_filled	2025-08-22 07:29:12.417262+00	2025-08-22 08:18:37.31216+00	86025732-906e-48c9-83fb-5c6a1f7bf7fd	a85b3619-691a-4656-9057-6ae1471f4b7d	[]
3	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22383/	not_filled	2025-08-22 07:29:13.114713+00	2025-08-22 08:18:38.421507+00	86025732-906e-48c9-83fb-5c6a1f7bf7fd	91771207-f7bc-489e-b2e1-6f6791fb1b2d	[]
1	2025-06-26	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20595/	not_filled	2025-08-22 07:29:13.808391+00	2025-08-22 08:19:19.848041+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	2133662a-9374-4cd7-bf85-9e171c032b95	[]
2	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21851/	not_filled	2025-08-22 07:29:14.164951+00	2025-08-22 08:19:20.436784+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	cdca919d-ce57-467c-90a6-401240d7273a	[]
4	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22371/	not_filled	2025-08-22 07:29:14.897878+00	2025-08-22 08:19:21.639098+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	44468394-609d-4288-aa61-dd369ad1c39e	[]
1	2025-07-03	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20877/	not_filled	2025-08-22 07:29:15.615827+00	2025-08-22 08:19:22.917398+00	035c59f2-9058-470e-a032-c7b492feda1f	9c526e0e-eaf0-4ee1-89cf-a7aebd65a69a	[]
2	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21867/	not_filled	2025-08-22 07:29:15.948941+00	2025-08-22 08:19:23.494959+00	035c59f2-9058-470e-a032-c7b492feda1f	86dffd79-9618-4965-b338-37429de403b6	[]
1	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21865/	not_filled	2025-08-22 07:29:16.656713+00	2025-08-22 08:19:25.301721+00	2f73d3c4-8b8b-485a-a8ab-661d492e75c9	83ee5e38-5923-4805-bef9-6fae41c14466	[]
1	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22381/	not_filled	2025-08-22 07:29:17.0272+00	2025-08-22 08:19:25.915768+00	59c63f22-0e2e-4f03-906e-d9f3883ae5da	27f3c283-bb29-4bdf-8324-481839461a9a	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22679/	not_filled	2025-08-22 07:29:17.691497+00	2025-08-22 08:19:27.137429+00	3b3dbfc5-534a-4810-a27b-8c46294f0239	ca515118-6295-4c0d-b56d-eca341445c7b	[]
1	2025-08-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22559/	not_filled	2025-08-22 07:29:18.394671+00	2025-08-22 08:19:28.352861+00	8f12b5c2-4304-49a6-bb1d-30bb9d92541e	2c8ad275-bac5-414a-9859-c707788ec148	[]
2	2025-05-28	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/19761/	not_filled	2025-08-22 07:29:19.110731+00	2025-08-22 08:19:29.519345+00	3f681dfc-6d8e-4e84-aaea-30f35ed686a7	1d35f6f1-0667-4b02-8452-41eee7a7d521	[]
1	2025-07-18	https://su10.bitrix24.ru/company/personal/user/895/tasks/task/view/21279/	not_filled	2025-08-22 07:29:19.50894+00	2025-08-22 08:19:30.183839+00	b344f9a7-5d2c-4883-bd97-02cc41771cf6	b6186c24-43f1-46a2-ae7b-a9b57e351692	[]
1	2025-03-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16813/	not_filled	2025-08-22 07:28:41.057203+00	2025-08-22 08:17:43.334258+00	5f19327a-321b-48ad-9624-199e76c9444a	89f3ee99-8808-4035-8a67-8742375a2bd1	[]
3	2025-07-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20723/	not_filled	2025-08-22 07:28:44.035301+00	2025-08-22 08:17:48.247717+00	f1d98d56-134c-41d7-b627-cf145d6042c3	4858fb0c-6dce-4d2f-9383-4b438b5eb9ef	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20497/	not_filled	2025-08-22 07:28:44.722504+00	2025-08-22 08:17:49.411114+00	3894bb58-3102-42b8-a210-0906ece8f431	ffbc9f16-3262-4170-aea6-a6133d80ecb3	[]
1	2025-03-12	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/16809/	not_filled	2025-08-22 07:28:42.314669+00	2025-08-22 08:17:45.219396+00	3da7a8e8-e73d-4e78-a60a-e94bba3d8ed3	3ed4a3f7-c9f9-415c-b1b2-baa604c4e826	[]
1	2025-03-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17141/	not_filled	2025-08-22 07:28:42.998005+00	2025-08-22 08:17:46.443942+00	4b947d29-2bf2-4182-a25a-e5bfb254a560	536d9021-108a-4443-891b-93fb77434d1e	[]
1	2025-06-21	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20501/	not_filled	2025-08-22 07:28:45.774027+00	2025-08-22 08:17:51.222447+00	17e81e5d-bdc1-4b08-81bb-cfd1ee5179a3	190aa6a0-3c96-4758-92d4-3c473ab9c9c6	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21315/	not_filled	2025-08-22 07:28:47.837644+00	2025-08-22 08:17:54.87157+00	3d99658c-d013-4598-beb3-2136eb9c4548	f59c12a2-9ef3-46a4-940a-852ca6cb804f	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22687/	not_filled	2025-08-22 07:28:51.405311+00	2025-08-22 08:18:01.089387+00	7610e7ea-65ad-4068-b1db-31ceefb3e40e	4c2e4773-8969-4a7d-b1d8-9ccf7048fe86	[]
1	2025-06-19	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20405/	not_filled	2025-08-22 07:28:56.683128+00	2025-08-22 08:18:10.203366+00	9251803f-c3d8-4a69-8e51-640850e20690	99be415e-6998-4801-b92f-98a1c737ea0f	[]
2	2025-04-22	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/18345/	not_filled	2025-08-22 07:29:00.302522+00	2025-08-22 08:18:17.426039+00	a8768648-7398-4c2a-9179-4e8ac3ae3dc8	c85018f3-dcb0-4188-af64-e6970bd90aeb	[]
1	2025-04-02	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/17667/?EVENT_TYPE=UPDATE&EVENT_TASK_ID=17667&EVENT_OPTIONS[STAY_AT_PAGE]=&EVENT_OPTIONS[SCOPE]=&EVENT_OPTIONS[FIRST_GRID_TASK_CREATION_TOUR_GUIDE]=	not_filled	2025-08-22 07:29:02.106234+00	2025-08-22 08:18:20.436097+00	806daac2-b7b5-4ce2-b852-95d2b3130475	5d770cce-7c56-4f81-8437-0875fda853d9	[]
1	2025-07-03	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20899/	not_filled	2025-08-22 07:29:08.147302+00	2025-08-22 08:18:30.016195+00	0c19a57a-b96e-4dc5-9f84-a7a816ccd4fc	832ac43a-4691-48fc-b679-4bb727d49df5	[]
1	2025-07-18	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21307/	not_filled	2025-08-22 07:29:09.206082+00	2025-08-22 08:18:31.986955+00	7b045b20-bf2d-4481-ab1a-0bbe2b11a30a	ce8362fd-7040-4877-b38f-ba89e6e3dd58	[]
3	2025-08-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22437/	not_filled	2025-08-22 07:29:09.899628+00	2025-08-22 08:18:33.244292+00	7b045b20-bf2d-4481-ab1a-0bbe2b11a30a	e8d6b100-9815-4285-bd61-86bf5c9daba1	[]
1	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22671/	not_filled	2025-08-22 07:29:10.949702+00	2025-08-22 08:18:35.009443+00	58a92868-c1d1-453a-811d-e221265324d9	f575487e-df07-478e-8ebd-5f7af585259d	[]
2	2025-07-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/20947/	not_filled	2025-08-22 07:29:11.668439+00	2025-08-22 08:18:36.150224+00	44359f67-fe61-43d9-90db-8752e2e48560	b9503ac9-cb93-4b0f-9c2d-54731aba5bf2	[]
2	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21873/	not_filled	2025-08-22 07:29:12.769431+00	2025-08-22 08:18:37.864913+00	86025732-906e-48c9-83fb-5c6a1f7bf7fd	70479c1d-23c9-45c5-a34c-362b9beae46a	[]
4	2025-08-01	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22393/	not_filled	2025-08-22 07:29:13.454965+00	2025-08-22 08:18:38.980302+00	86025732-906e-48c9-83fb-5c6a1f7bf7fd	0d2a2e8e-e1dc-4605-b6f6-f47a7de26fe7	[]
3	2025-07-25	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/21875/	not_filled	2025-08-22 07:29:14.559027+00	2025-08-22 08:19:21.045628+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	5b1c0f8d-7a6f-48c8-935e-378a024a91cc	[]
5	2025-08-02	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22401/	not_filled	2025-08-22 07:29:15.250718+00	2025-08-22 08:19:22.256376+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	2573eb61-a260-4981-b132-47639d064d46	[]
3	2025-08-05	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22435/	not_filled	2025-08-22 07:29:16.297287+00	2025-08-22 08:19:24.722956+00	035c59f2-9058-470e-a032-c7b492feda1f	9a1df6af-f330-411b-b35e-b05fb64fd9bf	[]
2	2025-08-14	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22683/	not_filled	2025-08-22 07:29:17.353744+00	2025-08-22 08:19:26.517045+00	59c63f22-0e2e-4f03-906e-d9f3883ae5da	9de82006-e19e-457a-9d5f-58b9bbeda830	[]
1	2025-08-08	https://su10.bitrix24.ru/workgroups/group/125/tasks/task/view/22563/	not_filled	2025-08-22 07:29:18.057689+00	2025-08-22 08:19:27.754993+00	5cbdd04c-f76e-4130-9a84-5667fcf18cdf	318160ac-7eee-4d07-99b7-203ab16822cc	[]
1	2025-04-24	https://su10.bitrix24.ru/company/personal/user/111/tasks/task/view/18463/	not_filled	2025-08-22 07:29:18.75602+00	2025-08-22 08:19:28.933107+00	3f681dfc-6d8e-4e84-aaea-30f35ed686a7	07b06a85-492b-4937-a214-30a07ec0d633	[]
3	2025-02-28	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/16283/	not_filled	2025-08-22 07:28:33.714974+00	2025-08-22 09:50:20.482097+00	a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a	19d5ddec-ed1f-490c-8e6e-717caaafc49b	[{"name": "СТ2601-14-АР0-АС-1-РД.pdf", "path": "public./Documentation/c95e1507-9c01-47c5-9858-40452f907466/a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a/СТ2601-14-АР0-АС-1-РД.pdf", "size": 11937146, "type": "application/pdf", "extension": "pdf", "uploadedAt": "2025-08-22T09:35:05.932Z"}, {"name": "alliya.xlsx", "path": "public./Documentation/c95e1507-9c01-47c5-9858-40452f907466/a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a/alliya.xlsx", "size": 24881, "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "extension": "xlsx", "uploadedAt": "2025-08-22T09:50:21.276Z"}]
3	2025-02-28	https://su10.bitrix24.ru/company/personal/user/821/tasks/task/view/16285/	not_filled	2025-08-22 07:28:32.627636+00	2025-08-22 09:18:46.6357+00	69e9397f-34fe-4b91-84e6-7339f13c5c2d	f1c3e3e8-2954-4dc9-ad82-91c2ec16b5c4	[]
1	2025-08-12	https://su10.bitrix24.ru/workgroups/group/131/tasks/task/view/22639/	not_filled	2025-08-21 09:32:19.474995+00	2025-08-27 13:09:14.206181+00	fa34f1a8-58c3-4c9e-8205-da6b56132658	7b62a552-7115-4c4b-a604-b318c5fe0c47	[{"url": "https://yadi.sk/d/lEWF2z3uqZEWRg", "name": "ETOBASA.xlsx", "path": "disk:/blueprintflow/Primavera_14/AR/ST26_01_14_AR0_AS_1_RD/ETOBASA.xlsx", "size": 10297, "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "extension": "xlsx", "uploadedAt": "2025-08-27T13:03:52.551Z"}, {"url": "https://yadi.sk/d/_J6Re7rKBCAzIQ", "name": "165-1-2024-РД2-АИ1 (2).pdf", "path": "disk:/blueprintflow/Primavera_14/AR/ST26_01_14_AR0_AS_1_RD/165-1-2024-РД2-АИ1 (2).pdf", "size": 13593562, "type": "application/pdf", "extension": "pdf", "uploadedAt": "2025-08-27T13:09:12.657Z"}]
\.


--
-- Data for Name: documentations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentations (code, tag_id, created_at, updated_at, id, stage) FROM stdin;
СТ26/01-14-КЖ-АС-01.2-РД	2	2025-08-21 09:32:39.347354+00	2025-08-21 09:32:39.347354+00	3df6f514-8768-4282-b31c-79c4b5b65394	Р
СТ26/01-14-КЖ4-0.3-РД	2	2025-08-21 09:32:39.721295+00	2025-08-21 09:32:40.141779+00	c3b9179e-74cc-407a-a5ee-a82a1f890ebe	Р
СТ26/01-14-КЖ2-02.1-РД	2	2025-08-21 09:32:21.76628+00	2025-08-21 09:32:22.143218+00	e84db261-4d46-4828-bf1a-7002b1f8c342	Р
СТ26/01-14-КЖ4-1.1-РД	2	2025-08-21 09:32:41.007782+00	2025-08-21 09:32:41.007782+00	650b14a9-07f2-4861-8637-091a8aa30398	Р
СТ26/01-14-КЖ4-1.2-РД	2	2025-08-21 09:32:41.417269+00	2025-08-21 09:32:41.970266+00	85733f4c-8afa-467b-ab16-038cfa6cf558	Р
СТ26/01-14-КЖ4-2.1-РД	2	2025-08-21 09:32:42.338067+00	2025-08-21 09:32:42.338067+00	926738bf-c167-4625-8125-6f7327dcaef1	Р
СТ26/01-14-КЖ3-02.1-РД	2	2025-08-21 09:32:22.50861+00	2025-08-21 09:32:22.872746+00	76452def-f7e8-456c-bd9b-8dfb0db0d30e	Р
СТ26/01-14-КЖ4-2.2-РД	2	2025-08-21 09:32:42.693091+00	2025-08-21 09:32:42.693091+00	888fdda1-e306-4fa1-ac1a-4c61a66ebdac	Р
СТ26/01-14-КЖ7-1.1-РД	2	2025-08-21 09:32:43.069138+00	2025-08-21 09:32:43.069138+00	8865eec6-d7b2-446b-ba08-4dbdf32f40cc	Р
СТ26/01-14-КЖ7-1.2-РД	2	2025-08-21 09:32:43.488739+00	2025-08-21 09:32:43.488739+00	e43c2fb6-e302-4c80-b05c-a7a9a5d3a740	Р
СТ26/01-14-КЖ7-2.2-РД	2	2025-08-21 09:32:43.87343+00	2025-08-21 09:32:43.87343+00	42a7bee4-a86e-4dcd-8c71-cd2d79512dbb	Р
СТ2601-14-КЖ.ЭГ	5	2025-08-21 09:32:44.292916+00	2025-08-21 09:32:44.292916+00	2d22a0a2-ab12-4b9a-8334-b05b87110a2e	Р
06/25-ГК-5-КЖ0	2	2025-08-22 07:28:31.735514+00	2025-08-25 15:26:33.972243+00	69e9397f-34fe-4b91-84e6-7339f13c5c2d	Р
СТ26/01-14-КЖ4-02.1-РД	2	2025-08-21 09:32:23.284665+00	2025-08-21 09:32:23.656691+00	2cd997ba-d211-43b4-988a-57dc26fc197d	Р
СТ26/01-14-КЖ5-02.1-РД	2	2025-08-21 09:32:24.044921+00	2025-08-21 09:32:24.044921+00	0e3905d8-9af3-446f-8a75-9c35ed6cdfc0	Р
13АВ-РД-АР3-К5	3	2025-08-22 07:28:30.949542+00	2025-08-22 08:17:27.440111+00	242a62fe-f985-49a2-88f0-de8ad166819d	Р
СТ26/01-14-КЖ6-02.1-РД	2	2025-08-21 09:32:24.425579+00	2025-08-21 09:32:24.801487+00	aa9e3f3e-7793-4116-9456-97263d75a1c5	Р
13АВ-РД-АР1.1-К4	3	2025-08-22 07:28:27.119303+00	2025-08-22 08:17:23.128962+00	ae4733f7-d46e-4d32-84af-d4e564208646	Р
06/25-ГК-4-КЖ0	2	2025-08-22 07:28:32.819392+00	2025-08-22 08:17:31.305106+00	a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a	Р
13АВ-РД-АР1.1-К5	3	2025-08-22 07:28:28.656802+00	2025-08-22 08:17:25.20303+00	e734d241-860c-4f89-ac10-d20c9c6c5cac	Р
СТ26/01-14-КЖ7-02.1-РД	2	2025-08-21 09:32:25.222721+00	2025-08-21 09:32:25.977148+00	de703c63-895b-4117-a7a7-1dfc389f7cb5	Р
13АВ-РД-КЖ0.2 -БК4	2	2025-08-22 07:28:34.24548+00	2025-08-22 08:17:32.978509+00	ed16c046-d590-4169-898d-45b17e06ded0	Р
СТ26/01-14-КЖ-АС-02.1-РД	2	2025-08-21 09:32:26.355635+00	2025-08-21 09:32:27.137885+00	91716c2b-9785-4268-b3c6-8df712438981	Р
13АВ-РД-СФ.2	2	2025-08-22 07:28:33.893094+00	2025-08-22 08:17:31.84992+00	51c84359-43fc-4caf-b1e0-51ee514a1627	Р
СТ26/01-14-КЖ1-01.1-РД	2	2025-08-21 09:32:27.537735+00	2025-08-21 09:32:27.892873+00	b3540776-a64e-43a8-8e14-ec9a52fccd35	Р
13АВ-РД-КЖ0.3-БК5	2	2025-08-22 07:28:34.982317+00	2025-08-22 08:17:33.942571+00	098c4ba0-c037-4603-9ea1-3c21a93f3718	Р
СТ26/01-14-КЖ1-01.2-РД	2	2025-08-21 09:32:28.254479+00	2025-08-21 09:32:28.627132+00	370b50ca-b9f5-4430-848c-7afcd64ca6c0	Р
13АВ-РД-КЖ0.1-ПА	2	2025-08-22 07:28:35.753785+00	2025-08-22 08:17:35.089341+00	d99591b3-7dfb-4de8-8bf1-d99d074f0ce5	Р
13АВ-РД-СФ-К3	2	2025-08-22 07:28:40.538891+00	2025-08-22 08:17:42.333161+00	d119e7a5-3055-43c1-b39c-8bf9dad1a531	Р
СТ26/01-14-КЖ2-01.1-РД	2	2025-08-21 09:32:29.00396+00	2025-08-21 09:32:29.374789+00	4a00e577-ff54-4471-a403-ef778bb11e6e	Р
13АВ-РД-КЖ0.3-ПА	2	2025-08-22 07:28:38.33103+00	2025-08-22 08:17:41.758259+00	3a769d69-c897-47db-bfc1-5fc54b893a47	Р
13АВ-РД-КЖ0-К3	2	2025-08-22 07:28:41.225497+00	2025-08-22 08:17:44.13364+00	0bfd342a-d2ec-471e-b994-88ed37b75b6c	Р
СТ26/01-14-КЖ2-01.2-РД	2	2025-08-21 09:32:29.761845+00	2025-08-21 09:32:30.147563+00	788d290c-abc1-44f4-be93-bb72f26dad83	Р
13АВ-РД-КЖ0-К6	2	2025-08-22 07:28:42.112245+00	2025-08-22 08:17:45.414107+00	3da7a8e8-e73d-4e78-a60a-e94bba3d8ed3	Р
13АВ-РД-КЖ5.1.1-К3	2	2025-08-22 07:28:43.158841+00	2025-08-22 08:17:48.424112+00	f1d98d56-134c-41d7-b627-cf145d6042c3	Р
СТ26/01-14-ПОС1	1	2025-08-21 09:32:15.367463+00	2025-08-21 09:32:15.367463+00	ec3d749d-8d35-49bb-a3a2-8a1b61f35d06	Р
СТ26/01-14-ПОС2	1	2025-08-21 09:32:15.884949+00	2025-08-21 09:32:15.884949+00	6a5d7eb8-ba66-4cc5-b8c9-93c6cda93271	Р
СТ26/01-14-КР-РД	1	2025-08-21 09:32:16.371817+00	2025-08-21 09:32:16.838681+00	ff07f546-c05a-4c0c-972a-7aee401714a1	Р
СТ26/01-14-ДК-РД (2280.Р.ДР/ГИ)	1	2025-08-21 09:32:17.305068+00	2025-08-21 09:32:17.714392+00	958177af-f289-4c50-8317-b7e064cf2ac1	Р
СТ26/01-14-ДК1-РД(2280.Р.ДР2)	1	2025-08-21 09:32:18.103856+00	2025-08-21 09:32:18.103856+00	e8693dc2-101d-4d9e-ac9c-5bf7d9d075a0	Р
СТ26/01-14-ГП-1-РД	1	2025-08-21 09:32:18.49243+00	2025-08-21 09:32:18.49243+00	3f19c800-5d2c-4ba0-8036-fe37bc21f6d5	Р
СТ26/01-14-АР0-АС-1-РД	3	2025-08-21 09:32:19.29011+00	2025-08-21 09:32:19.29011+00	fa34f1a8-58c3-4c9e-8205-da6b56132658	Р
СТ26/01-14-КЖ2-02.2-РД	2	2025-08-21 09:32:19.661031+00	2025-08-21 09:32:19.661031+00	1c7d2354-8f96-4a15-a401-deae1d27bb85	Р
СТ26/01-14-КЖ3-02.2-РД	2	2025-08-21 09:32:20.023616+00	2025-08-21 09:32:20.023616+00	62eb11c4-915f-43e4-89f7-6c3068f9ef77	Р
СТ26/01-14-КЖ5-02.2-РД	2	2025-08-21 09:32:20.394229+00	2025-08-21 09:32:20.394229+00	122f8545-cf1a-485e-856e-b7caf0a4501d	Р
СТ26/01-14-КЖ6-02.2-РД	2	2025-08-21 09:32:20.76099+00	2025-08-21 09:32:20.76099+00	336fd416-423a-49d6-a12c-afb1afc2f55f	Р
СТ26/01-14-КЖ1-02.1-РД	2	2025-08-21 09:32:21.152148+00	2025-08-21 09:32:21.152148+00	b4961ea6-874a-4bea-bb5a-c755adf4351d	Р
СТ26/01-14-КЖ3-01.1-РД	2	2025-08-21 09:32:30.536115+00	2025-08-21 09:32:30.536115+00	f3c1ac30-fecd-4179-9c2f-63d870f55251	Р
СТ26/01-14-КЖ3-01.2-РД	2	2025-08-21 09:32:30.899008+00	2025-08-21 09:32:31.272344+00	c7691b0e-1ad0-47c7-b64d-1fa765394ad0	Р
СТ26/01-14-КЖ4-01.1-РД	2	2025-08-21 09:32:31.664627+00	2025-08-21 09:32:32.015113+00	2c161a55-db1b-4450-a02f-68a1ad23d234	Р
СТ26/01-14-КЖ4-01.2-РД	2	2025-08-21 09:32:32.387323+00	2025-08-21 09:32:32.743195+00	b3e96832-c6a2-47b1-b75b-41c5b9e44b58	Р
СТ26/01-14-КЖ5-01.1-РД	2	2025-08-21 09:32:33.132986+00	2025-08-21 09:32:33.541278+00	e6ef80a1-ddf3-4d8d-a15a-be62755e795e	Р
СТ26/01-14-КЖ5-01.2-РД	2	2025-08-21 09:32:33.923974+00	2025-08-21 09:32:34.303167+00	f23c37ab-490b-4f48-99fa-1bcc2a0c5d65	Р
СТ26/01-14-КЖ6-01.1-РД	2	2025-08-21 09:32:34.847248+00	2025-08-21 09:32:34.847248+00	2a439585-672a-4ef7-8c93-d7a9c5ec8cce	Р
СТ26/01-14-КЖ6-01.2-РД	2	2025-08-21 09:32:35.245841+00	2025-08-21 09:32:35.245841+00	fd4ac328-da06-4d5e-bd9d-a867da1d3002	Р
СТ26/01-14-КЖ7-01.1-РД	2	2025-08-21 09:32:35.670255+00	2025-08-21 09:32:35.670255+00	9374198d-6171-425d-b097-796d824c5b25	Р
СТ26/01-14-КЖ7-01.2-РД	2	2025-08-21 09:32:36.055519+00	2025-08-21 09:32:37.406333+00	28625b76-6624-40d9-b62f-af18ac2b2de7	Р
СТ26/01-14-КЖ-АС-2-РД	2	2025-08-21 09:32:37.792877+00	2025-08-21 09:32:37.792877+00	0d2b3ef0-f533-46b7-9421-0a8d9c4429b1	Р
СТ26/01-14-КЖ-АС-01.1а-РД	2	2025-08-21 09:32:38.188013+00	2025-08-21 09:32:38.188013+00	bd03d3fb-bdd5-456d-ac7c-3abae6e109bd	Р
СТ26/01-14-КЖ-АС-01.1-РД	2	2025-08-21 09:32:38.56658+00	2025-08-21 09:32:38.984169+00	9ad69277-9144-4844-b5a9-8af0592db8cc	Р
13АВ-РД-ВП	1	2025-08-22 07:28:25.315514+00	2025-08-22 08:17:18.937351+00	82fb8525-b47b-4f21-84c3-5ea5ac30ac51	Р
13АВ-РД-ОК	1	2025-08-22 07:28:25.780253+00	2025-08-22 08:17:19.589949+00	e2393cc8-d3fe-4e8e-b2aa-e7014222dc9e	Р
13АВ-РД-АР1.2-К5	3	2025-08-22 07:28:26.736844+00	2025-08-22 08:17:20.859916+00	b31ec789-9a2b-415a-ac22-bad844f443dc	Р
1232-НВФ-КМ2	3	2025-08-22 07:28:30.211913+00	2025-08-22 08:17:25.58647+00	8b533c59-f839-4ec2-9ce2-d19df88337dd	Р
13АВ-РД-АР3-К4	3	2025-08-22 07:28:30.574606+00	2025-08-22 08:17:26.243507+00	0b710cac-6ff4-4b3f-8597-eba3dbdf2730	Р
13АВ-РД-КЖ0.2-ПА	2	2025-08-22 07:28:36.486707+00	2025-08-22 08:17:38.249369+00	937745b4-b809-43ef-98a0-582eb7ce7135	Р
13АВ-РД-КЖ0.1-БК3	2	2025-08-22 07:28:40.894262+00	2025-08-22 08:17:42.935082+00	5f19327a-321b-48ad-9624-199e76c9444a	Р
13АВ-РД-СФ-К6	2	2025-08-22 07:28:42.827835+00	2025-08-22 08:17:46.01555+00	4b947d29-2bf2-4182-a25a-e5bfb254a560	Р
13АВ-РД-КЖ5.6-9.1-К3	2	2025-08-22 07:28:47.330548+00	2025-08-22 08:17:53.843957+00	10f1d962-b920-4f8d-a675-84458469a4a0	Р
13АВ-РД-КЖ6.2-К4	2	2025-08-22 07:28:59.054962+00	2025-08-22 08:18:15.190199+00	648dba5f-0a84-4782-800a-1e03955c9136	Р
13АВ-РД-КЖ5.3-9.1-К5	2	2025-08-22 07:29:02.637109+00	2025-08-22 08:18:22.522284+00	48ffc696-b127-4121-8d41-72e63ce27922	Р
13АВ-РД-КЖ5.10.2-К5	2	2025-08-22 07:29:04.721435+00	2025-08-22 08:18:24.352976+00	2bb0b7a5-82c7-491f-b9d9-d2f874a00f85	Р
13АВ-РД-КЖ5.1.2-К3	2	2025-08-22 07:28:44.554184+00	2025-08-22 08:17:50.170326+00	3894bb58-3102-42b8-a210-0906ece8f431	Р
13АВ-РД-КЖ5.2.2-К3	2	2025-08-22 07:28:46.655259+00	2025-08-22 08:17:52.610976+00	4553f0c2-ce2c-434c-9518-019553b62715	Р
13АВ-РД-КЖ5.13.1-К5	2	2025-08-22 07:29:06.583134+00	2025-08-22 08:18:27.091089+00	c116b14a-68a0-4ead-aa87-77dee7ecc984	Р
13АВ-РД-КЖ5.10.2-К3	2	2025-08-22 07:28:50.184987+00	2025-08-22 08:17:59.419042+00	df45486e-d998-4540-93df-4ab7e9c8d9cd	Р
13АВ-РД-КЖ5.1.1-К4	2	2025-08-22 07:28:51.914396+00	2025-08-22 08:18:01.887442+00	a1e52472-dba3-498d-ad64-57ba3776876a	Р
13АВ-РД-КЖ5.3-9.2-К4	2	2025-08-22 07:28:55.824515+00	2025-08-22 08:18:09.151655+00	913c05cc-d6f0-4b07-8490-b1e18c1bae67	Р
13АВ-РД-КЖ5.10-17.1-К4	2	2025-08-22 07:28:56.501716+00	2025-08-22 08:18:09.768071+00	9251803f-c3d8-4a69-8e51-640850e20690	Р
13АВ-РД-КЖ5.18.1-К4	2	2025-08-22 07:28:57.607295+00	2025-08-22 08:18:12.861383+00	852f21db-e276-45ff-b7ae-574dc9f723db	Р
13АВ-РД-КЖ6.1-К4	2	2025-08-22 07:28:58.307096+00	2025-08-22 08:18:14.59438+00	4e9af931-8bf7-4f99-a215-d8883b17a691	Р
13АВ-РД-КЖ7.1-К4	2	2025-08-22 07:28:59.411723+00	2025-08-22 08:18:15.791462+00	6629caf2-f9b1-431c-822f-2d1eb2d4c097	Р
13АВ-РД-КЖ5.2.1-К5	2	2025-08-22 07:29:01.198909+00	2025-08-22 08:18:19.433503+00	e9e5f6d6-fec8-4982-9b29-9540a1b6529e	Р
13АВ-РД-КЖ5.2.1-К3	2	2025-08-22 07:28:45.587888+00	2025-08-22 08:17:52.004084+00	17e81e5d-bdc1-4b08-81bb-cfd1ee5179a3	Р
13АВ-РД-КЖ5.3-5.1-К3	2	2025-08-22 07:28:46.991796+00	2025-08-22 08:17:53.235941+00	39a2d76a-bbb9-4314-831a-d78603b8bb0f	Р
13АВ-РД-КЖ5.2.2-К5	2	2025-08-22 07:29:01.908258+00	2025-08-22 08:18:20.631208+00	806daac2-b7b5-4ce2-b852-95d2b3130475	Р
13АВ-РД-КЖ5.3-9.2-К5	2	2025-08-22 07:29:03.704458+00	2025-08-22 08:18:23.132072+00	e6f22d45-bcc3-48bb-a26b-5a348f993321	Р
13АВ-РД-КЖ5.6-9.2-К3	2	2025-08-22 07:28:47.669742+00	2025-08-22 08:17:55.66311+00	3d99658c-d013-4598-beb3-2136eb9c4548	Р
13АВ-РД-КЖ5.11-12.1-К5	2	2025-08-22 07:29:05.082216+00	2025-08-22 08:18:24.940195+00	e6eedd46-b64a-4278-9d6f-b7eb5d7a4123	Р
13АВ-РД-КЖ7.1-К3	2	2025-08-22 07:28:48.706538+00	2025-08-22 08:17:56.971002+00	bca2c0bc-a4c8-410e-bbad-3dafe1202c8d	Р
13АВ-РД-КЖ7.2-К3	2	2025-08-22 07:28:49.38535+00	2025-08-22 08:17:57.552054+00	d3e02784-6af0-4efa-b33c-274bcfe33dc4	Р
13АВ-РД-КЖ5.11-12.2-К3	2	2025-08-22 07:28:51.244753+00	2025-08-22 08:18:00.610322+00	7610e7ea-65ad-4068-b1db-31ceefb3e40e	Р
13АВ-РД-КЖ5.1.2-К4	2	2025-08-22 07:28:52.284108+00	2025-08-22 08:18:03.097636+00	afd8017a-6d65-4432-a645-9c9c735bc6d6	Р
13АВ-РД-КЖ5.2.1-К4	2	2025-08-22 07:28:52.984363+00	2025-08-22 08:18:03.675397+00	24aaa6e0-1a3c-4c8a-94b0-96684d646b36	Р
13АВ-РД-КЖ5.13.2-К5	2	2025-08-22 07:29:06.92528+00	2025-08-22 08:18:28.326477+00	32656b43-1b53-44ae-b2e2-81befd9cd7a5	Р
13АВ-РД-КЖ5.3-9.1-К4	2	2025-08-22 07:28:54.738849+00	2025-08-22 08:18:07.971401+00	8fbd85ce-682a-4e7a-8239-d6d385d7e85b	Р
13АВ-РД-КЖ5.10-17.2-К4	2	2025-08-22 07:28:56.869804+00	2025-08-22 08:18:10.999627+00	d9d67333-5aab-492c-80a3-c90f7e7edc19	Р
13АВ-РД-КЖ5.10.1-К3	2	2025-08-22 07:28:49.731569+00	2025-08-22 08:17:58.156872+00	f2bf8b78-faf9-41a9-8539-7b0765f913f5	Р
13АВ-РД-КЖ5.1-К3К4	2	2025-08-22 07:28:51.564698+00	2025-08-22 08:18:01.285298+00	b6111a7f-8322-41ad-82f2-d9cae09c7f9b	Р
13АВ-РД-КЖ5.1.2-К5	2	2025-08-22 07:29:00.470084+00	2025-08-22 08:18:18.219519+00	bacf8633-8d7d-4d5d-bd69-c799b13c4a02	Р
13АВ-РД-КЖ5.10.1-К5	2	2025-08-22 07:29:04.371371+00	2025-08-22 08:18:23.746908+00	6124c63f-4cae-43ef-ab34-95a50ddbf275	Р
13АВ-РД-КЖ5.2.2-К4	2	2025-08-22 07:28:53.313508+00	2025-08-22 08:18:06.177737+00	1901815b-66c7-465a-a8bb-ad5aa8eff42d	Р
13АВ-РД-КЖ5.1.1-К5	2	2025-08-22 07:28:59.747684+00	2025-08-22 08:18:17.03575+00	a8768648-7398-4c2a-9179-4e8ac3ae3dc8	Р
13АВ-РД-КЖ5.11-12.2-К5	2	2025-08-22 07:29:05.469187+00	2025-08-22 08:18:26.508779+00	9d43afc4-e71a-4ccf-916a-8f85689587bf	Р
13АВ-РД-КЖ5.14.1-К5	2	2025-08-22 07:29:07.626113+00	2025-08-22 08:18:28.949469+00	5ecd96f4-75ab-481f-99b7-3b9c23a5fb28	Р
13АВ-РД-КЖ5.14.2-К5	2	2025-08-22 07:29:07.958637+00	2025-08-22 08:18:30.218033+00	0c19a57a-b96e-4dc5-9f84-a7a816ccd4fc	Р
13АВ-РД-КЖ5.11-12.1-К3	2	2025-08-22 07:28:50.908822+00	2025-08-22 08:18:00.001728+00	db6f62f5-676d-491f-9a45-d5743fc245f3	Р
13АВ-РД-КЖ5.15.1-К5	2	2025-08-22 07:29:08.691678+00	2025-08-22 08:18:30.845777+00	e7c92fe3-bb13-4214-bfe9-725070f9c2d5	Р
13АВ-РД-КЖ6.1-К5	2	2025-08-22 07:29:09.036656+00	2025-08-22 08:18:32.820043+00	7b045b20-bf2d-4481-ab1a-0bbe2b11a30a	Р
13АВ-РД-КЖ6.2-К5	2	2025-08-22 07:29:10.074637+00	2025-08-22 08:18:33.439851+00	ed6a8820-be59-4e7e-93f7-9864827e96c7	Р
13АВ-РД-КЖ7.1-К5	2	2025-08-22 07:29:10.414668+00	2025-08-22 08:18:34.062437+00	7c6df5bb-a0d1-4ea1-b735-9d8bd6db3cba	Р
13АВ-РД-КЖ5.1-К5К6	2	2025-08-22 07:29:10.77956+00	2025-08-22 08:18:34.617458+00	58a92868-c1d1-453a-811d-e221265324d9	Р
13АВ-РД-КЖ5.1.1-К6	2	2025-08-22 07:29:11.125098+00	2025-08-22 08:18:35.762641+00	44359f67-fe61-43d9-90db-8752e2e48560	Р
13АВ-РД-КЖ5.1.2-К6	2	2025-08-22 07:29:11.848433+00	2025-08-22 08:18:36.344898+00	776191f4-9508-429f-b3f2-48ef5502ad86	Р
13АВ-РД-КЖ5.2.1-К6	2	2025-08-22 07:29:12.2436+00	2025-08-22 08:18:38.594327+00	86025732-906e-48c9-83fb-5c6a1f7bf7fd	Р
13АВ-РД-КЖ5.2.2-К6	2	2025-08-22 07:29:13.633649+00	2025-08-22 08:19:21.809842+00	bc1f1468-a2b7-417c-86e4-d994189f29bd	Р
13АВ-РД-КЖ5.3-9.1-К6	2	2025-08-22 07:29:15.440944+00	2025-08-22 08:19:24.308002+00	035c59f2-9058-470e-a032-c7b492feda1f	Р
13АВ-РД-КЖ5.3-9.2-К6	2	2025-08-22 07:29:16.477847+00	2025-08-22 08:19:24.898498+00	2f73d3c4-8b8b-485a-a8ab-661d492e75c9	Р
13АВ-РД-КЖ7.1-К6	2	2025-08-22 07:29:16.853626+00	2025-08-22 08:19:26.099362+00	59c63f22-0e2e-4f03-906e-d9f3883ae5da	Р
13АВ-РД-КЖ7.2-К6	2	2025-08-22 07:29:17.514876+00	2025-08-22 08:19:26.704565+00	3b3dbfc5-534a-4810-a27b-8c46294f0239	Р
13АВ-РД-КЖ5.10-12.1-К6	2	2025-08-22 07:29:17.874497+00	2025-08-22 08:19:27.326066+00	5cbdd04c-f76e-4130-9a84-5667fcf18cdf	Р
13АВ-РД-КЖ5.10-12.2-К6	2	2025-08-22 07:29:18.225232+00	2025-08-22 08:19:27.936203+00	8f12b5c2-4304-49a6-bb1d-30bb9d92541e	Р
2025-04-08_1232-ЧМ-КМ	3	2025-08-22 07:29:18.570967+00	2025-08-22 08:19:29.10909+00	3f681dfc-6d8e-4e84-aaea-30f35ed686a7	Р
1232-ПОС1	1	2025-08-22 07:28:24.628183+00	2025-08-25 15:26:32.720197+00	8dc51dec-082e-43cd-ad54-9b1de3599d00	Р
13АВ-РД-АР1.2-К4	3	2025-08-22 07:28:26.254011+00	2025-08-25 15:26:33.451447+00	536a19c1-be2e-4b3c-b3a1-2a1746e61378	Р
13АВ-РД-МЗ	5	2025-08-22 07:29:19.340394+00	2025-08-25 15:26:34.450623+00	b344f9a7-5d2c-4883-bd97-02cc41771cf6	Р
\.


--
-- Data for Name: documentations_projects_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentations_projects_mapping (documentation_id, project_id, block_id) FROM stdin;
ec3d749d-8d35-49bb-a3a2-8a1b61f35d06	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
6a5d7eb8-ba66-4cc5-b8c9-93c6cda93271	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
ff07f546-c05a-4c0c-972a-7aee401714a1	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
958177af-f289-4c50-8317-b7e064cf2ac1	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
e8693dc2-101d-4d9e-ac9c-5bf7d9d075a0	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
3f19c800-5d2c-4ba0-8036-fe37bc21f6d5	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
fa34f1a8-58c3-4c9e-8205-da6b56132658	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
1c7d2354-8f96-4a15-a401-deae1d27bb85	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
62eb11c4-915f-43e4-89f7-6c3068f9ef77	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
122f8545-cf1a-485e-856e-b7caf0a4501d	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
336fd416-423a-49d6-a12c-afb1afc2f55f	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
b4961ea6-874a-4bea-bb5a-c755adf4351d	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
e84db261-4d46-4828-bf1a-7002b1f8c342	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
76452def-f7e8-456c-bd9b-8dfb0db0d30e	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
2cd997ba-d211-43b4-988a-57dc26fc197d	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
0e3905d8-9af3-446f-8a75-9c35ed6cdfc0	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
aa9e3f3e-7793-4116-9456-97263d75a1c5	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
f1d98d56-134c-41d7-b627-cf145d6042c3	c95e1507-9c01-47c5-9858-40452f907466	\N
de703c63-895b-4117-a7a7-1dfc389f7cb5	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
91716c2b-9785-4268-b3c6-8df712438981	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
b3540776-a64e-43a8-8e14-ec9a52fccd35	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
370b50ca-b9f5-4430-848c-7afcd64ca6c0	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
4a00e577-ff54-4471-a403-ef778bb11e6e	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
788d290c-abc1-44f4-be93-bb72f26dad83	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
f3c1ac30-fecd-4179-9c2f-63d870f55251	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
c7691b0e-1ad0-47c7-b64d-1fa765394ad0	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
2c161a55-db1b-4450-a02f-68a1ad23d234	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
b3e96832-c6a2-47b1-b75b-41c5b9e44b58	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
e6ef80a1-ddf3-4d8d-a15a-be62755e795e	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
f23c37ab-490b-4f48-99fa-1bcc2a0c5d65	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
2a439585-672a-4ef7-8c93-d7a9c5ec8cce	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
fd4ac328-da06-4d5e-bd9d-a867da1d3002	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
9374198d-6171-425d-b097-796d824c5b25	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
806daac2-b7b5-4ce2-b852-95d2b3130475	c95e1507-9c01-47c5-9858-40452f907466	\N
17e81e5d-bdc1-4b08-81bb-cfd1ee5179a3	c95e1507-9c01-47c5-9858-40452f907466	\N
28625b76-6624-40d9-b62f-af18ac2b2de7	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
0d2b3ef0-f533-46b7-9421-0a8d9c4429b1	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
bd03d3fb-bdd5-456d-ac7c-3abae6e109bd	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
9ad69277-9144-4844-b5a9-8af0592db8cc	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
3df6f514-8768-4282-b31c-79c4b5b65394	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
c3b9179e-74cc-407a-a5ee-a82a1f890ebe	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
650b14a9-07f2-4861-8637-091a8aa30398	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
85733f4c-8afa-467b-ab16-038cfa6cf558	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
926738bf-c167-4625-8125-6f7327dcaef1	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
888fdda1-e306-4fa1-ac1a-4c61a66ebdac	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
8865eec6-d7b2-446b-ba08-4dbdf32f40cc	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
e43c2fb6-e302-4c80-b05c-a7a9a5d3a740	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
42a7bee4-a86e-4dcd-8c71-cd2d79512dbb	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
2d22a0a2-ab12-4b9a-8334-b05b87110a2e	f9227acf-9446-42c8-a533-bfeb30fa07a4	\N
ae4733f7-d46e-4d32-84af-d4e564208646	c95e1507-9c01-47c5-9858-40452f907466	\N
4553f0c2-ce2c-434c-9518-019553b62715	c95e1507-9c01-47c5-9858-40452f907466	\N
e734d241-860c-4f89-ac10-d20c9c6c5cac	c95e1507-9c01-47c5-9858-40452f907466	\N
242a62fe-f985-49a2-88f0-de8ad166819d	c95e1507-9c01-47c5-9858-40452f907466	\N
a4d1f99c-83a7-4e7b-a95f-bcd7eed2c90a	c95e1507-9c01-47c5-9858-40452f907466	\N
51c84359-43fc-4caf-b1e0-51ee514a1627	c95e1507-9c01-47c5-9858-40452f907466	\N
ed16c046-d590-4169-898d-45b17e06ded0	c95e1507-9c01-47c5-9858-40452f907466	\N
098c4ba0-c037-4603-9ea1-3c21a93f3718	c95e1507-9c01-47c5-9858-40452f907466	\N
d99591b3-7dfb-4de8-8bf1-d99d074f0ce5	c95e1507-9c01-47c5-9858-40452f907466	\N
ed6a8820-be59-4e7e-93f7-9864827e96c7	c95e1507-9c01-47c5-9858-40452f907466	\N
d3e02784-6af0-4efa-b33c-274bcfe33dc4	c95e1507-9c01-47c5-9858-40452f907466	\N
d119e7a5-3055-43c1-b39c-8bf9dad1a531	c95e1507-9c01-47c5-9858-40452f907466	\N
bca2c0bc-a4c8-410e-bbad-3dafe1202c8d	c95e1507-9c01-47c5-9858-40452f907466	\N
3a769d69-c897-47db-bfc1-5fc54b893a47	c95e1507-9c01-47c5-9858-40452f907466	\N
0bfd342a-d2ec-471e-b994-88ed37b75b6c	c95e1507-9c01-47c5-9858-40452f907466	\N
3da7a8e8-e73d-4e78-a60a-e94bba3d8ed3	c95e1507-9c01-47c5-9858-40452f907466	\N
e6f22d45-bcc3-48bb-a26b-5a348f993321	c95e1507-9c01-47c5-9858-40452f907466	\N
df45486e-d998-4540-93df-4ab7e9c8d9cd	c95e1507-9c01-47c5-9858-40452f907466	\N
afd8017a-6d65-4432-a645-9c9c735bc6d6	c95e1507-9c01-47c5-9858-40452f907466	\N
1901815b-66c7-465a-a8bb-ad5aa8eff42d	c95e1507-9c01-47c5-9858-40452f907466	\N
9251803f-c3d8-4a69-8e51-640850e20690	c95e1507-9c01-47c5-9858-40452f907466	\N
913c05cc-d6f0-4b07-8490-b1e18c1bae67	c95e1507-9c01-47c5-9858-40452f907466	\N
d9d67333-5aab-492c-80a3-c90f7e7edc19	c95e1507-9c01-47c5-9858-40452f907466	\N
852f21db-e276-45ff-b7ae-574dc9f723db	c95e1507-9c01-47c5-9858-40452f907466	\N
4e9af931-8bf7-4f99-a215-d8883b17a691	c95e1507-9c01-47c5-9858-40452f907466	\N
a8768648-7398-4c2a-9179-4e8ac3ae3dc8	c95e1507-9c01-47c5-9858-40452f907466	\N
bacf8633-8d7d-4d5d-bd69-c799b13c4a02	c95e1507-9c01-47c5-9858-40452f907466	\N
e9e5f6d6-fec8-4982-9b29-9540a1b6529e	c95e1507-9c01-47c5-9858-40452f907466	\N
c116b14a-68a0-4ead-aa87-77dee7ecc984	c95e1507-9c01-47c5-9858-40452f907466	\N
32656b43-1b53-44ae-b2e2-81befd9cd7a5	c95e1507-9c01-47c5-9858-40452f907466	\N
0c19a57a-b96e-4dc5-9f84-a7a816ccd4fc	c95e1507-9c01-47c5-9858-40452f907466	\N
86025732-906e-48c9-83fb-5c6a1f7bf7fd	c95e1507-9c01-47c5-9858-40452f907466	\N
44359f67-fe61-43d9-90db-8752e2e48560	c95e1507-9c01-47c5-9858-40452f907466	\N
59c63f22-0e2e-4f03-906e-d9f3883ae5da	c95e1507-9c01-47c5-9858-40452f907466	\N
035c59f2-9058-470e-a032-c7b492feda1f	c95e1507-9c01-47c5-9858-40452f907466	\N
2f73d3c4-8b8b-485a-a8ab-661d492e75c9	c95e1507-9c01-47c5-9858-40452f907466	\N
3f681dfc-6d8e-4e84-aaea-30f35ed686a7	c95e1507-9c01-47c5-9858-40452f907466	\N
8dc51dec-082e-43cd-ad54-9b1de3599d00	c95e1507-9c01-47c5-9858-40452f907466	\N
82fb8525-b47b-4f21-84c3-5ea5ac30ac51	c95e1507-9c01-47c5-9858-40452f907466	\N
e2393cc8-d3fe-4e8e-b2aa-e7014222dc9e	c95e1507-9c01-47c5-9858-40452f907466	\N
536a19c1-be2e-4b3c-b3a1-2a1746e61378	c95e1507-9c01-47c5-9858-40452f907466	\N
b31ec789-9a2b-415a-ac22-bad844f443dc	c95e1507-9c01-47c5-9858-40452f907466	\N
8b533c59-f839-4ec2-9ce2-d19df88337dd	c95e1507-9c01-47c5-9858-40452f907466	\N
0b710cac-6ff4-4b3f-8597-eba3dbdf2730	c95e1507-9c01-47c5-9858-40452f907466	\N
69e9397f-34fe-4b91-84e6-7339f13c5c2d	c95e1507-9c01-47c5-9858-40452f907466	\N
937745b4-b809-43ef-98a0-582eb7ce7135	c95e1507-9c01-47c5-9858-40452f907466	\N
5f19327a-321b-48ad-9624-199e76c9444a	c95e1507-9c01-47c5-9858-40452f907466	\N
4b947d29-2bf2-4182-a25a-e5bfb254a560	c95e1507-9c01-47c5-9858-40452f907466	\N
3894bb58-3102-42b8-a210-0906ece8f431	c95e1507-9c01-47c5-9858-40452f907466	\N
39a2d76a-bbb9-4314-831a-d78603b8bb0f	c95e1507-9c01-47c5-9858-40452f907466	\N
10f1d962-b920-4f8d-a675-84458469a4a0	c95e1507-9c01-47c5-9858-40452f907466	\N
3d99658c-d013-4598-beb3-2136eb9c4548	c95e1507-9c01-47c5-9858-40452f907466	\N
f2bf8b78-faf9-41a9-8539-7b0765f913f5	c95e1507-9c01-47c5-9858-40452f907466	\N
db6f62f5-676d-491f-9a45-d5743fc245f3	c95e1507-9c01-47c5-9858-40452f907466	\N
7610e7ea-65ad-4068-b1db-31ceefb3e40e	c95e1507-9c01-47c5-9858-40452f907466	\N
b6111a7f-8322-41ad-82f2-d9cae09c7f9b	c95e1507-9c01-47c5-9858-40452f907466	\N
a1e52472-dba3-498d-ad64-57ba3776876a	c95e1507-9c01-47c5-9858-40452f907466	\N
24aaa6e0-1a3c-4c8a-94b0-96684d646b36	c95e1507-9c01-47c5-9858-40452f907466	\N
8fbd85ce-682a-4e7a-8239-d6d385d7e85b	c95e1507-9c01-47c5-9858-40452f907466	\N
648dba5f-0a84-4782-800a-1e03955c9136	c95e1507-9c01-47c5-9858-40452f907466	\N
6629caf2-f9b1-431c-822f-2d1eb2d4c097	c95e1507-9c01-47c5-9858-40452f907466	\N
48ffc696-b127-4121-8d41-72e63ce27922	c95e1507-9c01-47c5-9858-40452f907466	\N
6124c63f-4cae-43ef-ab34-95a50ddbf275	c95e1507-9c01-47c5-9858-40452f907466	\N
2bb0b7a5-82c7-491f-b9d9-d2f874a00f85	c95e1507-9c01-47c5-9858-40452f907466	\N
e6eedd46-b64a-4278-9d6f-b7eb5d7a4123	c95e1507-9c01-47c5-9858-40452f907466	\N
9d43afc4-e71a-4ccf-916a-8f85689587bf	c95e1507-9c01-47c5-9858-40452f907466	\N
5ecd96f4-75ab-481f-99b7-3b9c23a5fb28	c95e1507-9c01-47c5-9858-40452f907466	\N
e7c92fe3-bb13-4214-bfe9-725070f9c2d5	c95e1507-9c01-47c5-9858-40452f907466	\N
7b045b20-bf2d-4481-ab1a-0bbe2b11a30a	c95e1507-9c01-47c5-9858-40452f907466	\N
7c6df5bb-a0d1-4ea1-b735-9d8bd6db3cba	c95e1507-9c01-47c5-9858-40452f907466	\N
58a92868-c1d1-453a-811d-e221265324d9	c95e1507-9c01-47c5-9858-40452f907466	\N
776191f4-9508-429f-b3f2-48ef5502ad86	c95e1507-9c01-47c5-9858-40452f907466	\N
bc1f1468-a2b7-417c-86e4-d994189f29bd	c95e1507-9c01-47c5-9858-40452f907466	\N
3b3dbfc5-534a-4810-a27b-8c46294f0239	c95e1507-9c01-47c5-9858-40452f907466	\N
5cbdd04c-f76e-4130-9a84-5667fcf18cdf	c95e1507-9c01-47c5-9858-40452f907466	\N
8f12b5c2-4304-49a6-bb1d-30bb9d92541e	c95e1507-9c01-47c5-9858-40452f907466	\N
b344f9a7-5d2c-4883-bd97-02cc41771cf6	c95e1507-9c01-47c5-9858-40452f907466	\N
8dc51dec-082e-43cd-ad54-9b1de3599d00	cf1eb082-1907-49c8-92e7-2616e4b2027d	\N
536a19c1-be2e-4b3c-b3a1-2a1746e61378	cf1eb082-1907-49c8-92e7-2616e4b2027d	\N
69e9397f-34fe-4b91-84e6-7339f13c5c2d	cf1eb082-1907-49c8-92e7-2616e4b2027d	\N
b344f9a7-5d2c-4883-bd97-02cc41771cf6	cf1eb082-1907-49c8-92e7-2616e4b2027d	\N
\.


--
-- Data for Name: entity_comments_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_comments_mapping (entity_type, entity_id, comment_id) FROM stdin;
documentation	e4ef7e84-0ab4-441c-8523-38beba1aebfb	47433fc3-4c26-4243-bb78-a708c93aeca0
documentation	9953817c-c512-4460-8dfd-4da3cef5d6a3	2d75cf36-4935-490e-85ce-5461f2cef9e8
\.


--
-- Data for Name: estimate_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estimate_items (id, estimate_id, description, quantity, unit_price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: estimates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estimates (id, project_id, type, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: floors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.floors (number) FROM stdin;
-3
-2
-1
0
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
117
118
119
120
\.


--
-- Data for Name: location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location (id, name, created_at, updated_at) FROM stdin;
1	Улица	2025-08-13 08:20:06.581211+00	2025-08-13 08:20:06.581211+00
2	Здание	2025-08-13 08:20:15.632255+00	2025-08-13 08:20:15.632255+00
3	Автостоянка	2025-08-13 08:20:20.7554+00	2025-08-13 08:20:20.7554+00
4	Технические помещения	2025-08-13 08:20:37.6055+00	2025-08-13 08:20:37.6055+00
5	Кладовки (Помещения не БКТ)	2025-08-13 08:20:43.228289+00	2025-08-13 08:20:43.228289+00
6	МОП ПЧ	2025-08-13 08:20:49.393049+00	2025-08-13 08:20:49.393049+00
7	МОП НЧ	2025-08-13 08:20:55.089678+00	2025-08-13 08:20:55.089678+00
8	Техпространство	2025-08-13 08:20:59.087435+00	2025-08-13 08:20:59.087435+00
9	Лобби	2025-08-13 08:21:04.268709+00	2025-08-13 08:21:04.268709+00
10	ЛК	2025-08-13 08:21:08.892269+00	2025-08-13 08:21:08.892269+00
11	Квартира	2025-08-13 08:21:13.220087+00	2025-08-13 08:21:13.220087+00
12	Кровля	2025-08-13 08:23:07.020036+00	2025-08-13 08:23:07.020036+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, address) FROM stdin;
c95e1507-9c01-47c5-9858-40452f907466	Алия	Летная 54
2785fec1-eea9-4047-8287-2a897dfddc20	Проект 2	ул. Курьи ножки
cf1eb082-1907-49c8-92e7-2616e4b2027d	Кинг	Мосфильмовская
f9227acf-9446-42c8-a533-bfeb30fa07a4	Примавера 14	Летная 555
\.


--
-- Data for Name: projects_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects_blocks (project_id, block_id, created_at, updated_at) FROM stdin;
c95e1507-9c01-47c5-9858-40452f907466	6b6f0d5a-c45d-4e36-904b-f98c6e828bbf	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
c95e1507-9c01-47c5-9858-40452f907466	723dee10-b8c2-499f-b2a8-dc04e9f43acc	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
c95e1507-9c01-47c5-9858-40452f907466	6885faba-a1bf-44c4-b698-38cc98f19aee	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
c95e1507-9c01-47c5-9858-40452f907466	6cb90104-4cd6-42c7-ae28-57177bae10ae	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
c95e1507-9c01-47c5-9858-40452f907466	4f3af58c-5710-4d6b-8cbb-1d4029c5ab7d	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
c95e1507-9c01-47c5-9858-40452f907466	8080912d-b59c-4b97-bafc-6aede5f9109f	2025-08-13 15:17:22.176541+00	2025-08-13 15:17:22.176541+00
2785fec1-eea9-4047-8287-2a897dfddc20	0e0f7096-788f-4927-8350-e17cb0320d53	2025-08-13 15:18:09.527659+00	2025-08-13 15:18:09.527659+00
2785fec1-eea9-4047-8287-2a897dfddc20	42c469b1-689d-4dec-b351-de2e91b5605b	2025-08-13 15:18:09.527659+00	2025-08-13 15:18:09.527659+00
f9227acf-9446-42c8-a533-bfeb30fa07a4	c16b4784-73f0-4f1b-9401-a964d0a81aa0	2025-08-13 16:43:57.035998+00	2025-08-13 16:43:57.035998+00
f9227acf-9446-42c8-a533-bfeb30fa07a4	b5837d17-e31c-4cf0-b45e-6c47343aaa13	2025-08-13 16:43:57.035998+00	2025-08-13 16:43:57.035998+00
cf1eb082-1907-49c8-92e7-2616e4b2027d	01bdd34e-14ea-48d7-87b6-cb0ed1dc23e8	2025-08-15 09:20:40.060174+00	2025-08-15 09:20:40.060174+00
cf1eb082-1907-49c8-92e7-2616e4b2027d	354ea1e5-40e5-49e7-8023-7c298ce0cd2a	2025-08-15 09:20:40.060174+00	2025-08-15 09:20:40.060174+00
cf1eb082-1907-49c8-92e7-2616e4b2027d	9f32283a-c8b7-43f2-8d86-e9e3370229eb	2025-08-15 09:20:40.060174+00	2025-08-15 09:20:40.060174+00
\.


--
-- Data for Name: rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rates (id, work_name, work_set, base_rate, unit_id, created_at, updated_at) FROM stdin;
fe746c26-ffa3-4def-946b-89458fc60a45	Кладка СТЕН: толщиной 150мм из газосиликатных  блоков (ГСБ)	СТЕНЫ	3000	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:27.312959+00	2025-08-25 15:20:27.312959+00
23b7300e-a128-4484-b96b-6ba783158745	Кладка СТЕН: толщиной 200мм из газосиликатных  блоков (ГСБ)	СТЕНЫ	3000	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:27.591014+00	2025-08-25 15:20:27.591014+00
5f597c2c-6651-42fa-8f23-db1ddab0d99b	Кладка СТЕН: толщиной 250мм из газосиликатных  блоков (ГСБ)	СТЕНЫ	3000	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:27.792365+00	2025-08-25 15:20:27.792365+00
8408b660-bc7f-44fe-a1a7-d83271239c19	Кладка СТЕН: толщиной 300мм из газосиликатных  блоков (ГСБ)	СТЕНЫ	3000	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:27.970227+00	2025-08-25 15:20:27.970227+00
c879f29b-d9d8-4ea1-8673-ae5c93b79989	Кладка СТЕН: толщиной 190 мм : из легкобетонных блоков ( СКЦ ) полнотелых	СТЕНЫ	3600	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:28.163854+00	2025-08-25 15:20:28.163854+00
d899b2c5-5a76-4385-b874-8afc84df0c5f	Кладка СТЕН: толщиной 250 мм из кирпича одинарного рядового	СТЕНЫ	3600	3ffb8bf8-c7cd-49b6-b8c4-735d41355949	2025-08-25 15:20:28.368571+00	2025-08-25 15:20:28.368571+00
79f67fcc-1286-4ab3-8702-42f2187bafe2	Кладка ПЕРЕГОРОДОК: толщиной 75 мм из Газосиликатных блоков	ПЕРЕГОРОДКИ	500	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:28.583378+00	2025-08-25 15:20:28.583378+00
a3ce9710-5a5a-4e0d-93ef-01a2ca962f5d	Кладка ПЕРЕГОРОДОК: толщиной 100 мм из Газосиликатных блоков	ПЕРЕГОРОДКИ	500	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:28.83176+00	2025-08-25 15:20:28.83176+00
41360821-7747-4dc1-851b-f6bd1a328bd6	Кладка ПЕРЕГОРОДОК: толщиной 80 мм из Пазогребниевых блоков	ПЕРЕГОРОДКИ	450	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:29.04236+00	2025-08-25 15:20:29.04236+00
f7f8ff3b-868f-43e7-9117-c60db7d1a62e	Кладка ПЕРЕГОРОДОК: толщиной 100 мм из Пазогребниевых блоков	ПЕРЕГОРОДКИ	450	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:29.269624+00	2025-08-25 15:20:29.269624+00
d9568d48-207d-4b79-bbcf-7d8155b01db7	Кладка ПЕРЕГОРОДОК: толщиной 90 мм из Легкобетонных блоков	ПЕРЕГОРОДКИ	600	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:29.90511+00	2025-08-25 15:20:29.90511+00
905f411d-a999-4221-898e-cb8f7f7c312e	Кладка ПЕРЕГОРОДОК: толщиной 120 мм из Кирпича	ПЕРЕГОРОДКИ	600	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:30.112428+00	2025-08-25 15:20:30.112428+00
5eefe2b1-55ba-42a7-9328-ec657c1e2f4e	Кладка наружных стен толщиной 120 мм из кирпича облицовочного	СТЕНЫ	585	80ad8cd8-7fd1-402c-b536-7b1e16d71772	2025-08-25 15:20:31.010397+00	2025-08-25 15:20:31.010397+00
74428773-0a8e-4ae6-8f66-dd66d6390279	Монтаж металлоконструкций кладки: фахверковые колонны	ФАХВЕРКОВЫЕ КОЛОННЫ	20000	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-25 15:20:30.827092+00	2025-08-27 12:52:18.620992+00
e80c5bf1-2a98-4372-a896-cdea049d09e6	Изготовление металлоконструкций кладки: фахверковые колонны (	ФАХВЕРКОВЫЕ КОЛОННЫ	10000	b7eb7037-cb2b-4180-8a15-6e334e122e79	2025-08-25 15:20:30.658896+00	2025-08-27 12:52:19.265168+00
d0899634-4e43-444b-afbb-65ff907b9958	Трассировка перегорордок в квартирах из гипсовых пазогребневых плит ПГП	ТРАССИРОВКА	225	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-25 15:20:30.471753+00	2025-08-27 12:52:19.774509+00
3d73f00e-7607-43be-a042-1973feb08ed6	Трассировка перегорордок в квартирах из ГСБ h=0,25м)  (с	ТРАССИРОВКА	150	05d8126b-a759-4a2b-86c5-fab955492e50	2025-08-25 15:20:30.287965+00	2025-08-27 12:52:20.269123+00
\.


--
-- Data for Name: rates_detail_cost_categories_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rates_detail_cost_categories_mapping (rate_id, detail_cost_category_id) FROM stdin;
fe746c26-ffa3-4def-946b-89458fc60a45	643
23b7300e-a128-4484-b96b-6ba783158745	643
5f597c2c-6651-42fa-8f23-db1ddab0d99b	643
8408b660-bc7f-44fe-a1a7-d83271239c19	643
c879f29b-d9d8-4ea1-8673-ae5c93b79989	643
d899b2c5-5a76-4385-b874-8afc84df0c5f	643
79f67fcc-1286-4ab3-8702-42f2187bafe2	643
a3ce9710-5a5a-4e0d-93ef-01a2ca962f5d	643
41360821-7747-4dc1-851b-f6bd1a328bd6	643
f7f8ff3b-868f-43e7-9117-c60db7d1a62e	643
d9568d48-207d-4b79-bbcf-7d8155b01db7	643
905f411d-a999-4221-898e-cb8f7f7c312e	643
5eefe2b1-55ba-42a7-9328-ec657c1e2f4e	643
74428773-0a8e-4ae6-8f66-dd66d6390279	644
e80c5bf1-2a98-4372-a896-cdea049d09e6	644
d0899634-4e43-444b-afbb-65ff907b9958	643
3d73f00e-7607-43be-a042-1973feb08ed6	643
\.


--
-- Data for Name: reference_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reference_data (id, name, data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statuses (id, name, color, is_active, created_at, updated_at, applicable_pages) FROM stdin;
8316b4f0-6b0f-4a21-9d12-6c0953e490fd	Данные заполнены по пересчету РД	green	t	2025-08-20 12:42:58.534299+00	2025-08-20 12:42:58.534299+00	[]
c724b4ff-81fa-4c30-9962-b9e7e9cda8c7	Данные заполнены по спеке РД	yellow	t	2025-08-20 12:42:58.534299+00	2025-08-20 12:42:58.534299+00	[]
0b9a8738-7c97-4cd0-9dd0-019a9b3be970	Данные не заполнены	red	t	2025-08-20 12:42:58.534299+00	2025-08-20 12:42:58.534299+00	[]
0661a184-5e66-4e11-b47f-db38f2a7e91e	Созданы ВОР	blue	t	2025-08-20 12:42:58.534299+00	2025-08-20 12:42:58.534299+00	[]
\.


--
-- Data for Name: storage_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_mappings (table_name, entity_id, slug, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, name, created_at, description, updated_at) FROM stdin;
80ad8cd8-7fd1-402c-b536-7b1e16d71772	м2	2025-08-11 09:22:35.030671+00	метр квадратный, площадь	2025-08-13 07:36:11.784449+00
3ffb8bf8-c7cd-49b6-b8c4-735d41355949	м3	2025-08-11 09:22:48.958672+00	метр куб, объем	2025-08-13 07:36:11.784449+00
b7eb7037-cb2b-4180-8a15-6e334e122e79	тн	2025-08-11 13:33:11.989355+00		2025-08-13 07:36:11.784449+00
05d8126b-a759-4a2b-86c5-fab955492e50	м.п.	2025-08-12 06:52:46.586788+00	метры погонные	2025-08-13 07:36:11.784449+00
ac24e31e-e04c-4ed2-b64a-4abb21152f80	шт	2025-08-12 06:52:20.122114+00	\N	2025-08-13 07:36:11.784449+00
99ecd3e0-7449-49c4-938a-1233aa3e7b98	месяц	2025-08-13 07:27:30.327458+00	\N	2025-08-13 07:36:11.784449+00
92d5fd4d-eb25-4562-9292-a3defdcbb01e	компл	2025-08-13 07:28:02.486623+00	\N	2025-08-13 07:36:11.784449+00
c2e45369-70af-4049-b8d0-2a90d510c974	тн/м пог	2025-08-13 10:03:40.390082+00	\N	2025-08-13 10:03:40.390082+00
\.


--
-- Data for Name: work_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_progress (id, project_id, description, quantity, unit_id, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2025-08-11 06:16:25
20211116045059	2025-08-11 06:16:28
20211116050929	2025-08-11 06:16:29
20211116051442	2025-08-11 06:16:31
20211116212300	2025-08-11 06:16:33
20211116213355	2025-08-11 06:16:35
20211116213934	2025-08-11 06:16:36
20211116214523	2025-08-11 06:16:40
20211122062447	2025-08-11 06:16:42
20211124070109	2025-08-11 06:16:43
20211202204204	2025-08-11 06:16:45
20211202204605	2025-08-11 06:16:47
20211210212804	2025-08-11 06:16:52
20211228014915	2025-08-11 06:16:53
20220107221237	2025-08-11 06:16:55
20220228202821	2025-08-11 06:16:57
20220312004840	2025-08-11 06:16:58
20220603231003	2025-08-11 06:17:01
20220603232444	2025-08-11 06:17:03
20220615214548	2025-08-11 06:17:04
20220712093339	2025-08-11 06:17:06
20220908172859	2025-08-11 06:17:08
20220916233421	2025-08-11 06:17:09
20230119133233	2025-08-11 06:17:11
20230128025114	2025-08-11 06:17:13
20230128025212	2025-08-11 06:17:15
20230227211149	2025-08-11 06:17:16
20230228184745	2025-08-11 06:17:18
20230308225145	2025-08-11 06:17:20
20230328144023	2025-08-11 06:17:21
20231018144023	2025-08-11 06:17:23
20231204144023	2025-08-11 06:17:26
20231204144024	2025-08-11 06:17:27
20231204144025	2025-08-11 06:17:29
20240108234812	2025-08-11 06:17:31
20240109165339	2025-08-11 06:17:32
20240227174441	2025-08-11 06:17:35
20240311171622	2025-08-11 06:17:37
20240321100241	2025-08-11 06:17:41
20240401105812	2025-08-11 06:17:45
20240418121054	2025-08-11 06:17:48
20240523004032	2025-08-11 06:17:53
20240618124746	2025-08-11 06:17:55
20240801235015	2025-08-11 06:17:57
20240805133720	2025-08-11 06:17:58
20240827160934	2025-08-11 06:18:00
20240919163303	2025-08-11 06:18:02
20240919163305	2025-08-11 06:18:04
20241019105805	2025-08-11 06:18:05
20241030150047	2025-08-11 06:18:11
20241108114728	2025-08-11 06:18:14
20241121104152	2025-08-11 06:18:15
20241130184212	2025-08-11 06:18:17
20241220035512	2025-08-11 06:18:19
20241220123912	2025-08-11 06:18:20
20241224161212	2025-08-11 06:18:22
20250107150512	2025-08-11 06:18:24
20250110162412	2025-08-11 06:18:25
20250123174212	2025-08-11 06:18:27
20250128220012	2025-08-11 06:18:29
20250506224012	2025-08-11 06:18:30
20250523164012	2025-08-11 06:18:32
20250714121412	2025-08-11 06:18:33
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (id, type, format, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2025-08-11 06:16:23.054048
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2025-08-11 06:16:23.079528
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2025-08-11 06:16:23.09185
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2025-08-11 06:16:23.174383
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2025-08-11 06:16:23.317996
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2025-08-11 06:16:23.323086
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2025-08-11 06:16:23.332913
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2025-08-11 06:16:23.339609
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2025-08-11 06:16:23.347479
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2025-08-11 06:16:23.353437
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2025-08-11 06:16:23.362526
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2025-08-11 06:16:23.370539
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2025-08-11 06:16:23.389494
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2025-08-11 06:16:23.394468
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2025-08-11 06:16:23.404682
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2025-08-11 06:16:23.452605
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2025-08-11 06:16:23.457913
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2025-08-11 06:16:23.46284
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2025-08-11 06:16:23.47105
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2025-08-11 06:16:23.48786
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2025-08-11 06:16:23.493457
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2025-08-11 06:16:23.500681
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2025-08-11 06:16:23.528681
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2025-08-11 06:16:23.556069
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2025-08-11 06:16:23.561368
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2025-08-11 06:16:23.56625
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2025-08-22 10:51:21.725302
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2025-08-22 10:51:21.82721
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2025-08-22 10:51:21.837354
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2025-08-22 10:51:21.846364
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2025-08-22 10:51:21.85231
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2025-08-22 10:51:21.860265
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2025-08-22 10:51:21.870381
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2025-08-22 10:51:21.877748
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2025-08-22 10:51:21.879778
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2025-08-22 10:51:21.887431
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2025-08-22 10:51:21.892035
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2025-08-22 10:51:21.905119
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2025-08-22 10:51:21.912871
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: cost_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cost_categories_id_seq', 257, true);


--
-- Name: detail_cost_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detail_cost_categories_id_seq', 821, true);


--
-- Name: documentation_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documentation_tags_id_seq', 7, true);


--
-- Name: location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_id_seq', 12, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: block_floor_mapping block_floor_mapping_block_id_floor_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_floor_mapping
    ADD CONSTRAINT block_floor_mapping_block_id_floor_number_key UNIQUE (block_id, floor_number);


--
-- Name: block_floor_mapping block_floor_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_floor_mapping
    ADD CONSTRAINT block_floor_mapping_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: chessboard_documentation_mapping chessboard_documentation_mapping_chessboard_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_documentation_mapping
    ADD CONSTRAINT chessboard_documentation_mapping_chessboard_id_key UNIQUE (chessboard_id);


--
-- Name: chessboard_documentation_mapping chessboard_documentation_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_documentation_mapping
    ADD CONSTRAINT chessboard_documentation_mapping_pkey PRIMARY KEY (id);


--
-- Name: chessboard_floor_mapping chessboard_floor_mapping_chessboard_id_floor_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_floor_mapping
    ADD CONSTRAINT chessboard_floor_mapping_chessboard_id_floor_number_key UNIQUE (chessboard_id, floor_number);


--
-- Name: chessboard_floor_mapping chessboard_floor_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_floor_mapping
    ADD CONSTRAINT chessboard_floor_mapping_pkey PRIMARY KEY (id);


--
-- Name: chessboard_mapping chessboard_mapping_chessboard_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_chessboard_id_key UNIQUE (chessboard_id);


--
-- Name: chessboard_mapping chessboard_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_pkey PRIMARY KEY (id);


--
-- Name: chessboard chessboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard
    ADD CONSTRAINT chessboard_pkey PRIMARY KEY (id);


--
-- Name: chessboard_rates_mapping chessboard_rates_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_rates_mapping
    ADD CONSTRAINT chessboard_rates_mapping_pkey PRIMARY KEY (chessboard_id, rate_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: cost_categories cost_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_name_unique UNIQUE (name);


--
-- Name: cost_categories cost_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_pkey PRIMARY KEY (id);


--
-- Name: detail_cost_categories detail_cost_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_cost_categories
    ADD CONSTRAINT detail_cost_categories_pkey PRIMARY KEY (id);


--
-- Name: disk_settings disk_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disk_settings
    ADD CONSTRAINT disk_settings_pkey PRIMARY KEY (id);


--
-- Name: documentations documentation_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations
    ADD CONSTRAINT documentation_codes_code_key UNIQUE (code);


--
-- Name: documentation_file_paths documentation_file_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_file_paths
    ADD CONSTRAINT documentation_file_paths_pkey PRIMARY KEY (id);


--
-- Name: documentation_tags documentation_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_tags
    ADD CONSTRAINT documentation_tags_pkey PRIMARY KEY (id);


--
-- Name: documentation_tags documentation_tags_tag_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_tags
    ADD CONSTRAINT documentation_tags_tag_number_key UNIQUE (tag_number);


--
-- Name: documentation_versions documentation_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_versions
    ADD CONSTRAINT documentation_versions_pkey PRIMARY KEY (id);


--
-- Name: documentations documentations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations
    ADD CONSTRAINT documentations_pkey PRIMARY KEY (id);


--
-- Name: documentations_projects_mapping documentations_projects_mappi_documentation_id_project_id_b_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations_projects_mapping
    ADD CONSTRAINT documentations_projects_mappi_documentation_id_project_id_b_key UNIQUE (documentation_id, project_id, block_id);


--
-- Name: documentations_projects_mapping documentations_projects_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations_projects_mapping
    ADD CONSTRAINT documentations_projects_mapping_pkey PRIMARY KEY (documentation_id, project_id);


--
-- Name: entity_comments_mapping entity_comments_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_comments_mapping
    ADD CONSTRAINT entity_comments_mapping_pkey PRIMARY KEY (entity_type, entity_id, comment_id);


--
-- Name: estimate_items estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (number);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: projects_blocks projects_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_blocks
    ADD CONSTRAINT projects_blocks_pkey PRIMARY KEY (project_id, block_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: rates_detail_cost_categories_mapping rates_detail_cost_categories_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates_detail_cost_categories_mapping
    ADD CONSTRAINT rates_detail_cost_categories_mapping_pkey PRIMARY KEY (rate_id, detail_cost_category_id);


--
-- Name: rates rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates
    ADD CONSTRAINT rates_pkey PRIMARY KEY (id);


--
-- Name: rates rates_work_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates
    ADD CONSTRAINT rates_work_name_key UNIQUE (work_name);


--
-- Name: reference_data reference_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reference_data
    ADD CONSTRAINT reference_data_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_name_key UNIQUE (name);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: storage_mappings storage_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_mappings
    ADD CONSTRAINT storage_mappings_pkey PRIMARY KEY (table_name, entity_id);


--
-- Name: units units_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_name_key UNIQUE (name);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: work_progress work_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_progress
    ADD CONSTRAINT work_progress_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_block_floor_mapping_block_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_block_floor_mapping_block_id ON public.block_floor_mapping USING btree (block_id);


--
-- Name: idx_block_floor_mapping_floor_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_block_floor_mapping_floor_number ON public.block_floor_mapping USING btree (floor_number);


--
-- Name: idx_chessboard_documentation_mapping_chessboard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_documentation_mapping_chessboard_id ON public.chessboard_documentation_mapping USING btree (chessboard_id);


--
-- Name: idx_chessboard_documentation_mapping_documentation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_documentation_mapping_documentation_id ON public.chessboard_documentation_mapping USING btree (documentation_id);


--
-- Name: idx_chessboard_floor_mapping_chessboard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_floor_mapping_chessboard_id ON public.chessboard_floor_mapping USING btree (chessboard_id);


--
-- Name: idx_chessboard_floor_mapping_floor_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_floor_mapping_floor_number ON public.chessboard_floor_mapping USING btree (floor_number);


--
-- Name: idx_chessboard_rates_mapping_chessboard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_rates_mapping_chessboard_id ON public.chessboard_rates_mapping USING btree (chessboard_id);


--
-- Name: idx_chessboard_rates_mapping_rate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chessboard_rates_mapping_rate_id ON public.chessboard_rates_mapping USING btree (rate_id);


--
-- Name: idx_comments_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_author_id ON public.comments USING btree (author_id);


--
-- Name: idx_documentation_tags_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_tags_name ON public.documentation_tags USING btree (name);


--
-- Name: idx_documentation_tags_tag_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_tags_tag_number ON public.documentation_tags USING btree (tag_number);


--
-- Name: idx_documentation_versions_documentation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_versions_documentation_id ON public.documentation_versions USING btree (documentation_id);


--
-- Name: idx_documentation_versions_issue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_versions_issue_date ON public.documentation_versions USING btree (issue_date);


--
-- Name: idx_documentation_versions_local_files; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_versions_local_files ON public.documentation_versions USING gin (local_files);


--
-- Name: idx_documentation_versions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_versions_status ON public.documentation_versions USING btree (status);


--
-- Name: idx_documentation_versions_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentation_versions_version ON public.documentation_versions USING btree (version_number);


--
-- Name: idx_documentations_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_code ON public.documentations USING btree (code);


--
-- Name: idx_documentations_projects_mapping_block_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_projects_mapping_block_id ON public.documentations_projects_mapping USING btree (block_id);


--
-- Name: idx_documentations_projects_mapping_documentation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_projects_mapping_documentation_id ON public.documentations_projects_mapping USING btree (documentation_id);


--
-- Name: idx_documentations_projects_mapping_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_projects_mapping_project_id ON public.documentations_projects_mapping USING btree (project_id);


--
-- Name: idx_documentations_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_stage ON public.documentations USING btree (stage);


--
-- Name: idx_documentations_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documentations_tag_id ON public.documentations USING btree (tag_id);


--
-- Name: idx_entity_comments_mapping_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_comments_mapping_comment_id ON public.entity_comments_mapping USING btree (comment_id);


--
-- Name: idx_entity_comments_mapping_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_comments_mapping_type_id ON public.entity_comments_mapping USING btree (entity_type, entity_id);


--
-- Name: idx_rates_detail_cost_categories_mapping_detail_cost_category_i; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rates_detail_cost_categories_mapping_detail_cost_category_i ON public.rates_detail_cost_categories_mapping USING btree (detail_cost_category_id);


--
-- Name: idx_rates_detail_cost_categories_mapping_rate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rates_detail_cost_categories_mapping_rate_id ON public.rates_detail_cost_categories_mapping USING btree (rate_id);


--
-- Name: idx_rates_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rates_updated_at ON public.rates USING btree (updated_at);


--
-- Name: idx_rates_work_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rates_work_name ON public.rates USING btree (work_name);


--
-- Name: idx_statuses_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_statuses_is_active ON public.statuses USING btree (is_active);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: documentation_tags storage_doc_tags_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER storage_doc_tags_after_insert AFTER INSERT ON public.documentation_tags FOR EACH ROW EXECUTE FUNCTION public.trg_storage_doc_tags();


--
-- Name: documentation_versions storage_doc_versions_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER storage_doc_versions_after_insert AFTER INSERT ON public.documentation_versions FOR EACH ROW EXECUTE FUNCTION public.trg_storage_doc_versions();


--
-- Name: projects storage_projects_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER storage_projects_after_insert AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.trg_storage_projects();


--
-- Name: rates trigger_update_rates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_rates_updated_at BEFORE UPDATE ON public.rates FOR EACH ROW EXECUTE FUNCTION public.update_rates_updated_at();


--
-- Name: block_floor_mapping update_block_floor_mapping_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_block_floor_mapping_updated_at BEFORE UPDATE ON public.block_floor_mapping FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chessboard_floor_mapping update_chessboard_floor_mapping_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chessboard_floor_mapping_updated_at BEFORE UPDATE ON public.chessboard_floor_mapping FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documentation_tags update_documentation_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_documentation_tags_updated_at BEFORE UPDATE ON public.documentation_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documentation_versions update_documentation_versions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_documentation_versions_updated_at BEFORE UPDATE ON public.documentation_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documentations update_documentations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_documentations_updated_at BEFORE UPDATE ON public.documentations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: statuses update_statuses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_statuses_updated_at BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: block_floor_mapping block_floor_mapping_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_floor_mapping
    ADD CONSTRAINT block_floor_mapping_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE CASCADE;


--
-- Name: block_floor_mapping block_floor_mapping_floor_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_floor_mapping
    ADD CONSTRAINT block_floor_mapping_floor_number_fkey FOREIGN KEY (floor_number) REFERENCES public.floors(number) ON DELETE CASCADE;


--
-- Name: chessboard_documentation_mapping chessboard_documentation_mapping_chessboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_documentation_mapping
    ADD CONSTRAINT chessboard_documentation_mapping_chessboard_id_fkey FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE;


--
-- Name: chessboard_documentation_mapping chessboard_documentation_mapping_documentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_documentation_mapping
    ADD CONSTRAINT chessboard_documentation_mapping_documentation_id_fkey FOREIGN KEY (documentation_id) REFERENCES public.documentations(id) ON DELETE CASCADE;


--
-- Name: chessboard_floor_mapping chessboard_floor_mapping_chessboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_floor_mapping
    ADD CONSTRAINT chessboard_floor_mapping_chessboard_id_fkey FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE;


--
-- Name: chessboard_floor_mapping chessboard_floor_mapping_floor_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_floor_mapping
    ADD CONSTRAINT chessboard_floor_mapping_floor_number_fkey FOREIGN KEY (floor_number) REFERENCES public.floors(number) ON DELETE CASCADE;


--
-- Name: chessboard_mapping chessboard_mapping_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id);


--
-- Name: chessboard_mapping chessboard_mapping_chessboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_chessboard_id_fkey FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE;


--
-- Name: chessboard_mapping chessboard_mapping_cost_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_cost_category_id_fkey FOREIGN KEY (cost_category_id) REFERENCES public.cost_categories(id);


--
-- Name: chessboard_mapping chessboard_mapping_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.detail_cost_categories(id);


--
-- Name: chessboard_mapping chessboard_mapping_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_mapping
    ADD CONSTRAINT chessboard_mapping_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: chessboard chessboard_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard
    ADD CONSTRAINT chessboard_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: chessboard_rates_mapping chessboard_rates_mapping_chessboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_rates_mapping
    ADD CONSTRAINT chessboard_rates_mapping_chessboard_id_fkey FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE;


--
-- Name: chessboard_rates_mapping chessboard_rates_mapping_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard_rates_mapping
    ADD CONSTRAINT chessboard_rates_mapping_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE CASCADE;


--
-- Name: chessboard chessboard_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chessboard
    ADD CONSTRAINT chessboard_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: cost_categories cost_categories_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: detail_cost_categories detail_cost_categories_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_cost_categories
    ADD CONSTRAINT detail_cost_categories_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: documentations documentation_codes_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations
    ADD CONSTRAINT documentation_codes_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.documentation_tags(id) ON DELETE SET NULL;


--
-- Name: documentation_file_paths documentation_file_paths_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_file_paths
    ADD CONSTRAINT documentation_file_paths_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.documentation_versions(id) ON DELETE CASCADE;


--
-- Name: documentation_versions documentation_versions_documentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentation_versions
    ADD CONSTRAINT documentation_versions_documentation_id_fkey FOREIGN KEY (documentation_id) REFERENCES public.documentations(id) ON DELETE CASCADE;


--
-- Name: documentations_projects_mapping documentations_projects_mapping_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations_projects_mapping
    ADD CONSTRAINT documentations_projects_mapping_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE CASCADE;


--
-- Name: documentations_projects_mapping documentations_projects_mapping_documentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations_projects_mapping
    ADD CONSTRAINT documentations_projects_mapping_documentation_id_fkey FOREIGN KEY (documentation_id) REFERENCES public.documentations(id) ON DELETE CASCADE;


--
-- Name: documentations_projects_mapping documentations_projects_mapping_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentations_projects_mapping
    ADD CONSTRAINT documentations_projects_mapping_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: entity_comments_mapping entity_comments_mapping_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_comments_mapping
    ADD CONSTRAINT entity_comments_mapping_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimates estimates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: detail_cost_categories fk_detail_cost_categories_cost_categories; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_cost_categories
    ADD CONSTRAINT fk_detail_cost_categories_cost_categories FOREIGN KEY (cost_category_id) REFERENCES public.cost_categories(id);


--
-- Name: detail_cost_categories fk_detail_cost_categories_location; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_cost_categories
    ADD CONSTRAINT fk_detail_cost_categories_location FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: projects_blocks projects_blocks_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_blocks
    ADD CONSTRAINT projects_blocks_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE CASCADE;


--
-- Name: projects_blocks projects_blocks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_blocks
    ADD CONSTRAINT projects_blocks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: rates_detail_cost_categories_mapping rates_cost_categories_mapping_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates_detail_cost_categories_mapping
    ADD CONSTRAINT rates_cost_categories_mapping_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE CASCADE;


--
-- Name: rates_detail_cost_categories_mapping rates_detail_cost_categories_mapping_detail_cost_category_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates_detail_cost_categories_mapping
    ADD CONSTRAINT rates_detail_cost_categories_mapping_detail_cost_category_id_fk FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id) ON DELETE CASCADE;


--
-- Name: rates rates_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rates
    ADD CONSTRAINT rates_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: work_progress work_progress_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_progress
    ADD CONSTRAINT work_progress_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: work_progress work_progress_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_progress
    ADD CONSTRAINT work_progress_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION fill_storage_mappings(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fill_storage_mappings() TO anon;
GRANT ALL ON FUNCTION public.fill_storage_mappings() TO authenticated;
GRANT ALL ON FUNCTION public.fill_storage_mappings() TO service_role;


--
-- Name: FUNCTION set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer) TO anon;
GRANT ALL ON FUNCTION public.set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer) TO authenticated;
GRANT ALL ON FUNCTION public.set_block_floor_range(p_block_id uuid, p_from_floor integer, p_to_floor integer) TO service_role;


--
-- Name: FUNCTION transliterate(input text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.transliterate(input text) TO anon;
GRANT ALL ON FUNCTION public.transliterate(input text) TO authenticated;
GRANT ALL ON FUNCTION public.transliterate(input text) TO service_role;


--
-- Name: FUNCTION trg_storage_doc_tags(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_storage_doc_tags() TO anon;
GRANT ALL ON FUNCTION public.trg_storage_doc_tags() TO authenticated;
GRANT ALL ON FUNCTION public.trg_storage_doc_tags() TO service_role;


--
-- Name: FUNCTION trg_storage_doc_versions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_storage_doc_versions() TO anon;
GRANT ALL ON FUNCTION public.trg_storage_doc_versions() TO authenticated;
GRANT ALL ON FUNCTION public.trg_storage_doc_versions() TO service_role;


--
-- Name: FUNCTION trg_storage_projects(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_storage_projects() TO anon;
GRANT ALL ON FUNCTION public.trg_storage_projects() TO authenticated;
GRANT ALL ON FUNCTION public.trg_storage_projects() TO service_role;


--
-- Name: FUNCTION update_rates_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_rates_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_rates_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_rates_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE block_floor_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.block_floor_mapping TO anon;
GRANT ALL ON TABLE public.block_floor_mapping TO authenticated;
GRANT ALL ON TABLE public.block_floor_mapping TO service_role;


--
-- Name: TABLE blocks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blocks TO anon;
GRANT ALL ON TABLE public.blocks TO authenticated;
GRANT ALL ON TABLE public.blocks TO service_role;


--
-- Name: TABLE chessboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chessboard TO anon;
GRANT ALL ON TABLE public.chessboard TO authenticated;
GRANT ALL ON TABLE public.chessboard TO service_role;


--
-- Name: TABLE chessboard_documentation_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chessboard_documentation_mapping TO anon;
GRANT ALL ON TABLE public.chessboard_documentation_mapping TO authenticated;
GRANT ALL ON TABLE public.chessboard_documentation_mapping TO service_role;


--
-- Name: TABLE chessboard_floor_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chessboard_floor_mapping TO anon;
GRANT ALL ON TABLE public.chessboard_floor_mapping TO authenticated;
GRANT ALL ON TABLE public.chessboard_floor_mapping TO service_role;


--
-- Name: TABLE chessboard_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chessboard_mapping TO anon;
GRANT ALL ON TABLE public.chessboard_mapping TO authenticated;
GRANT ALL ON TABLE public.chessboard_mapping TO service_role;


--
-- Name: TABLE chessboard_rates_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chessboard_rates_mapping TO anon;
GRANT ALL ON TABLE public.chessboard_rates_mapping TO authenticated;
GRANT ALL ON TABLE public.chessboard_rates_mapping TO service_role;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;


--
-- Name: TABLE cost_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cost_categories TO anon;
GRANT ALL ON TABLE public.cost_categories TO authenticated;
GRANT ALL ON TABLE public.cost_categories TO service_role;


--
-- Name: SEQUENCE cost_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.cost_categories_id_seq TO anon;
GRANT ALL ON SEQUENCE public.cost_categories_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.cost_categories_id_seq TO service_role;


--
-- Name: TABLE detail_cost_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_cost_categories TO anon;
GRANT ALL ON TABLE public.detail_cost_categories TO authenticated;
GRANT ALL ON TABLE public.detail_cost_categories TO service_role;


--
-- Name: SEQUENCE detail_cost_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.detail_cost_categories_id_seq TO anon;
GRANT ALL ON SEQUENCE public.detail_cost_categories_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detail_cost_categories_id_seq TO service_role;


--
-- Name: TABLE disk_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.disk_settings TO anon;
GRANT ALL ON TABLE public.disk_settings TO authenticated;
GRANT ALL ON TABLE public.disk_settings TO service_role;


--
-- Name: TABLE documentation_file_paths; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentation_file_paths TO anon;
GRANT ALL ON TABLE public.documentation_file_paths TO authenticated;
GRANT ALL ON TABLE public.documentation_file_paths TO service_role;


--
-- Name: TABLE documentation_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentation_tags TO anon;
GRANT ALL ON TABLE public.documentation_tags TO authenticated;
GRANT ALL ON TABLE public.documentation_tags TO service_role;


--
-- Name: SEQUENCE documentation_tags_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documentation_tags_id_seq TO anon;
GRANT ALL ON SEQUENCE public.documentation_tags_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.documentation_tags_id_seq TO service_role;


--
-- Name: TABLE documentation_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentation_versions TO anon;
GRANT ALL ON TABLE public.documentation_versions TO authenticated;
GRANT ALL ON TABLE public.documentation_versions TO service_role;


--
-- Name: TABLE documentations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentations TO anon;
GRANT ALL ON TABLE public.documentations TO authenticated;
GRANT ALL ON TABLE public.documentations TO service_role;


--
-- Name: TABLE documentations_projects_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentations_projects_mapping TO anon;
GRANT ALL ON TABLE public.documentations_projects_mapping TO authenticated;
GRANT ALL ON TABLE public.documentations_projects_mapping TO service_role;


--
-- Name: TABLE entity_comments_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.entity_comments_mapping TO anon;
GRANT ALL ON TABLE public.entity_comments_mapping TO authenticated;
GRANT ALL ON TABLE public.entity_comments_mapping TO service_role;


--
-- Name: TABLE estimate_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.estimate_items TO anon;
GRANT ALL ON TABLE public.estimate_items TO authenticated;
GRANT ALL ON TABLE public.estimate_items TO service_role;


--
-- Name: TABLE estimates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.estimates TO anon;
GRANT ALL ON TABLE public.estimates TO authenticated;
GRANT ALL ON TABLE public.estimates TO service_role;


--
-- Name: TABLE floors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.floors TO anon;
GRANT ALL ON TABLE public.floors TO authenticated;
GRANT ALL ON TABLE public.floors TO service_role;


--
-- Name: TABLE location; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location TO anon;
GRANT ALL ON TABLE public.location TO authenticated;
GRANT ALL ON TABLE public.location TO service_role;


--
-- Name: SEQUENCE location_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.location_id_seq TO anon;
GRANT ALL ON SEQUENCE public.location_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.location_id_seq TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE projects_blocks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects_blocks TO anon;
GRANT ALL ON TABLE public.projects_blocks TO authenticated;
GRANT ALL ON TABLE public.projects_blocks TO service_role;


--
-- Name: TABLE rates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rates TO anon;
GRANT ALL ON TABLE public.rates TO authenticated;
GRANT ALL ON TABLE public.rates TO service_role;


--
-- Name: TABLE rates_detail_cost_categories_mapping; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rates_detail_cost_categories_mapping TO anon;
GRANT ALL ON TABLE public.rates_detail_cost_categories_mapping TO authenticated;
GRANT ALL ON TABLE public.rates_detail_cost_categories_mapping TO service_role;


--
-- Name: TABLE reference_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reference_data TO anon;
GRANT ALL ON TABLE public.reference_data TO authenticated;
GRANT ALL ON TABLE public.reference_data TO service_role;


--
-- Name: TABLE statuses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.statuses TO anon;
GRANT ALL ON TABLE public.statuses TO authenticated;
GRANT ALL ON TABLE public.statuses TO service_role;


--
-- Name: TABLE storage_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_mappings TO anon;
GRANT ALL ON TABLE public.storage_mappings TO authenticated;
GRANT ALL ON TABLE public.storage_mappings TO service_role;


--
-- Name: TABLE units; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.units TO anon;
GRANT ALL ON TABLE public.units TO authenticated;
GRANT ALL ON TABLE public.units TO service_role;


--
-- Name: TABLE v_block_floor_range; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_block_floor_range TO anon;
GRANT ALL ON TABLE public.v_block_floor_range TO authenticated;
GRANT ALL ON TABLE public.v_block_floor_range TO service_role;


--
-- Name: TABLE work_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.work_progress TO anon;
GRANT ALL ON TABLE public.work_progress TO authenticated;
GRANT ALL ON TABLE public.work_progress TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict HQiOWqNHjnJwLnt3llPuvZQLKVTMweqVsgRq6cc4yEgjfqYrllMKg4kYO6QWwOz

