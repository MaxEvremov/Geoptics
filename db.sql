--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.0
-- Dumped by pg_dump version 9.5.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: nearest_date(timestamp with time zone, timestamp with time zone[]); Type: FUNCTION; Schema: public; Owner: lwpss
--

CREATE FUNCTION nearest_date(ts timestamp with time zone, dates timestamp with time zone[]) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
DECLARE
    result timestamptz;
BEGIN
    SELECT unnest INTO result
    FROM unnest(dates)
    ORDER BY abs(EXTRACT(EPOCH FROM unnest) - EXTRACT(EPOCH FROM ts))
    LIMIT 1;
    RETURN result;
END
$$;


ALTER FUNCTION public.nearest_date(ts timestamp with time zone, dates timestamp with time zone[]) OWNER TO lwpss;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: favorites; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE favorites (
    user_id integer,
    name text,
    created_at timestamp with time zone DEFAULT (now())::timestamp(0) with time zone,
    updated_at timestamp with time zone,
    id integer NOT NULL,
    plots jsonb,
    well_id integer
);


ALTER TABLE favorites OWNER TO lwpss;

--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: lwpss
--

CREATE SEQUENCE favorites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE favorites_id_seq OWNER TO lwpss;

--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lwpss
--

ALTER SEQUENCE favorites_id_seq OWNED BY favorites.id;


--
-- Name: length_annotations; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE length_annotations (
    well_id integer,
    id integer NOT NULL,
    name text,
    y1 numeric,
    y2 numeric,
    css_class text
);


ALTER TABLE length_annotations OWNER TO lwpss;

--
-- Name: length_annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: lwpss
--

CREATE SEQUENCE length_annotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE length_annotations_id_seq OWNER TO lwpss;

--
-- Name: length_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lwpss
--

ALTER SEQUENCE length_annotations_id_seq OWNED BY length_annotations.id;


--
-- Name: p_measurements; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE p_measurements (
    date timestamp with time zone,
    pressure real,
    well_id integer
);


ALTER TABLE p_measurements OWNER TO lwpss;

--
-- Name: sessions_admin; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE sessions_admin (
    sid character varying,
    sess json,
    expire timestamp(6) without time zone
);


ALTER TABLE sessions_admin OWNER TO lwpss;

--
-- Name: sessions_app; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE sessions_app (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE sessions_app OWNER TO lwpss;

--
-- Name: t_measurements; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE t_measurements (
    length real,
    temp real,
    date timestamp with time zone,
    well_id integer
);


ALTER TABLE t_measurements OWNER TO lwpss;

--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE timeline_events (
    well_id integer,
    short_text text,
    description text,
    date timestamp with time zone,
    created_at timestamp with time zone,
    id integer NOT NULL
);


ALTER TABLE timeline_events OWNER TO lwpss;

--
-- Name: timeline_events_id_seq; Type: SEQUENCE; Schema: public; Owner: lwpss
--

CREATE SEQUENCE timeline_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE timeline_events_id_seq OWNER TO lwpss;

--
-- Name: timeline_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lwpss
--

ALTER SEQUENCE timeline_events_id_seq OWNED BY timeline_events.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE users (
    id integer NOT NULL,
    name text,
    email text,
    hash text,
    salt text,
    updated_at timestamp without time zone,
    created_at timestamp without time zone,
    role text
);


ALTER TABLE users OWNER TO lwpss;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: lwpss
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO lwpss;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lwpss
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: well_permissions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE well_permissions (
    user_id integer NOT NULL,
    well_id integer NOT NULL,
    has_access boolean
);


ALTER TABLE well_permissions OWNER TO root;

--
-- Name: wells; Type: TABLE; Schema: public; Owner: lwpss
--

CREATE TABLE wells (
    id integer NOT NULL,
    name text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    reference_temp real,
    reference_length real,
    min_length real DEFAULT 0,
    well_xml_id text,
    has_t_sensor boolean,
    has_p_sensor boolean
);


ALTER TABLE wells OWNER TO lwpss;

--
-- Name: wells_id_seq; Type: SEQUENCE; Schema: public; Owner: lwpss
--

CREATE SEQUENCE wells_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE wells_id_seq OWNER TO lwpss;

--
-- Name: wells_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lwpss
--

ALTER SEQUENCE wells_id_seq OWNED BY wells.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY favorites ALTER COLUMN id SET DEFAULT nextval('favorites_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY length_annotations ALTER COLUMN id SET DEFAULT nextval('length_annotations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY timeline_events ALTER COLUMN id SET DEFAULT nextval('timeline_events_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY wells ALTER COLUMN id SET DEFAULT nextval('wells_id_seq'::regclass);


--
-- Name: favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: length_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY length_annotations
    ADD CONSTRAINT length_annotations_pkey PRIMARY KEY (id);


--
-- Name: session_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY sessions_app
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: users_email_key; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wells_pkey; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY wells
    ADD CONSTRAINT wells_pkey PRIMARY KEY (id);


--
-- Name: wells_well_xml_id_key; Type: CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY wells
    ADD CONSTRAINT wells_well_xml_id_key UNIQUE (well_xml_id);


--
-- Name: favorites_user_id; Type: INDEX; Schema: public; Owner: lwpss
--

CREATE INDEX favorites_user_id ON favorites USING btree (user_id);


--
-- Name: p_measurements_date_idx; Type: INDEX; Schema: public; Owner: lwpss
--

CREATE INDEX p_measurements_date_idx ON p_measurements USING btree (date);


--
-- Name: p_measurements_well_id_idx; Type: INDEX; Schema: public; Owner: lwpss
--

CREATE INDEX p_measurements_well_id_idx ON p_measurements USING btree (well_id);


--
-- Name: t_measurements_date_length_well_id_idx; Type: INDEX; Schema: public; Owner: lwpss
--

CREATE INDEX t_measurements_date_length_well_id_idx ON t_measurements USING btree (date, length, well_id);


--
-- Name: timeline_events_well_id_idx; Type: INDEX; Schema: public; Owner: lwpss
--

CREATE INDEX timeline_events_well_id_idx ON timeline_events USING btree (well_id);


--
-- Name: favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: favorites_well_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY favorites
    ADD CONSTRAINT favorites_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id);


--
-- Name: length_annotations_well_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY length_annotations
    ADD CONSTRAINT length_annotations_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id);


--
-- Name: p_measurements_well_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY p_measurements
    ADD CONSTRAINT p_measurements_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id);


--
-- Name: t_measurements_well_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY t_measurements
    ADD CONSTRAINT t_measurements_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id);


--
-- Name: timeline_events_well_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lwpss
--

ALTER TABLE ONLY timeline_events
    ADD CONSTRAINT timeline_events_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: lwpss
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM lwpss;
GRANT ALL ON SCHEMA public TO lwpss;
GRANT ALL ON SCHEMA public TO root;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

