-- =============================================================================
-- Corrector de Proyectos — PostgreSQL 16 schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_salt / crypt for password hashing


-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
CREATE TYPE profesor_rol AS ENUM ('admin', 'profesor', 'tutor');


-- =============================================================================
-- Core catalog tables
-- =============================================================================

CREATE TABLE legislacion (
    id          SERIAL          PRIMARY KEY,
    abreviatura VARCHAR(20)     NOT NULL UNIQUE,
    anio_inicio SMALLINT        NOT NULL CHECK (anio_inicio > 1900),
    anio_fin    SMALLINT        CHECK (anio_fin IS NULL OR anio_fin > anio_inicio),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  legislacion            IS 'Marco legislativo educativo (p.ej. LOMLOE, LOE)';
COMMENT ON COLUMN legislacion.anio_fin   IS 'NULL si la legislación sigue vigente';


CREATE TABLE ciclo (
    id              SERIAL      PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    legislacion_id  INT         NOT NULL REFERENCES legislacion(id)
                                    ON DELETE RESTRICT
                                    ON UPDATE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ciclo IS 'Ciclo Formativo de Grado (p.ej. DAW, DAM, ASIR)';

CREATE INDEX idx_ciclo_legislacion ON ciclo(legislacion_id);


CREATE TABLE modulo (
    id              SERIAL      PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    abreviatura     VARCHAR(10)  NOT NULL,
    horas_semanales SMALLINT    NOT NULL CHECK (horas_semanales > 0),
    ciclo_id        INT         NOT NULL REFERENCES ciclo(id)
                                    ON DELETE RESTRICT
                                    ON UPDATE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE modulo IS 'Módulo profesional dentro de un ciclo formativo';

CREATE INDEX idx_modulo_ciclo ON modulo(ciclo_id);


-- =============================================================================
-- Users
-- =============================================================================

CREATE TABLE profesor (
    id              SERIAL          PRIMARY KEY,
    username        VARCHAR(60)     NOT NULL UNIQUE,
    password_hash   TEXT            NOT NULL,
    rol             profesor_rol    NOT NULL,
    tutor_ciclo_id  INT             UNIQUE
                                    REFERENCES ciclo(id)
                                        ON DELETE SET NULL
                                        ON UPDATE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- rol='tutor'  ↔  tutor_ciclo_id IS NOT NULL
    -- rol='admin'  →  tutor_ciclo_id IS NULL (covered by the biconditional)
    CONSTRAINT chk_tutor_ciclo
        CHECK ( (rol = 'tutor') = (tutor_ciclo_id IS NOT NULL) )
);

COMMENT ON TABLE  profesor                  IS 'Usuarios del sistema: admin, profesor o tutor';
COMMENT ON COLUMN profesor.password_hash    IS 'Hash bcrypt — never store plaintext';
COMMENT ON COLUMN profesor.tutor_ciclo_id   IS 'NULL para admin y profesor; obligatorio para tutor';

CREATE INDEX idx_profesor_tutor_ciclo ON profesor(tutor_ciclo_id) WHERE tutor_ciclo_id IS NOT NULL;


-- Trigger: a ciclo may have at most 1 tutor
CREATE OR REPLACE FUNCTION trg_max_tutores_por_ciclo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tutor_ciclo_id IS NOT NULL THEN
        IF (
            SELECT COUNT(*)
            FROM   profesor
            WHERE  tutor_ciclo_id = NEW.tutor_ciclo_id
              AND  id <> COALESCE(NEW.id, -1)
        ) >= 1 THEN
            RAISE EXCEPTION
                'El ciclo % ya tiene un tutor asignado (máximo 1 permitido)',
                NEW.tutor_ciclo_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_max_tutores
    BEFORE INSERT OR UPDATE OF tutor_ciclo_id ON profesor
    FOR EACH ROW EXECUTE FUNCTION trg_max_tutores_por_ciclo();


-- Professor ↔ Module (current assignment, no academic year)
CREATE TABLE profesor_modulo (
    profesor_id INT NOT NULL REFERENCES profesor(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    modulo_id   INT NOT NULL REFERENCES modulo(id)
                        ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (profesor_id, modulo_id)
);

COMMENT ON TABLE profesor_modulo IS 'Asignación actual de módulos a profesores (sin historico de año)';

CREATE INDEX idx_profesor_modulo_modulo ON profesor_modulo(modulo_id);


-- =============================================================================
-- Students
-- =============================================================================

CREATE TABLE alumno (
    id          SERIAL      PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    ciclo_id    INT         NOT NULL REFERENCES ciclo(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  alumno        IS 'Alumno matriculado en un ciclo formativo';
COMMENT ON COLUMN alumno.nombre IS 'Texto libre: nombre real o código anonimizado (p.ej. JJ499)';

CREATE INDEX idx_alumno_ciclo  ON alumno(ciclo_id);
CREATE INDEX idx_alumno_nombre ON alumno(nombre);


-- Student ↔ Module enrollment (explicit, managed by profesor)
CREATE TABLE alumno_modulo (
    alumno_id   INT NOT NULL REFERENCES alumno(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    modulo_id   INT NOT NULL REFERENCES modulo(id)
                        ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (alumno_id, modulo_id)
);

COMMENT ON TABLE alumno_modulo IS 'Matrícula explícita del alumno en módulos de su ciclo';

CREATE INDEX idx_alumno_modulo_modulo ON alumno_modulo(modulo_id);


-- =============================================================================
-- Projects
-- =============================================================================

CREATE TABLE proyecto (
    id              SERIAL          PRIMARY KEY,
    nombre          VARCHAR(120)    NOT NULL,
    ciclo_id        INT             NOT NULL REFERENCES ciclo(id)
                                        ON DELETE RESTRICT
                                        ON UPDATE CASCADE,
    academic_year   CHAR(9)         NOT NULL
                                    CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  proyecto              IS 'Proyecto de fin de ciclo';
COMMENT ON COLUMN proyecto.academic_year IS 'Formato YYYY-YYYY p.ej. 2024-2025';

CREATE INDEX idx_proyecto_ciclo        ON proyecto(ciclo_id);
CREATE INDEX idx_proyecto_academic_year ON proyecto(academic_year);


CREATE TABLE proyecto_alumno (
    proyecto_id INT NOT NULL REFERENCES proyecto(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    alumno_id   INT NOT NULL REFERENCES alumno(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (proyecto_id, alumno_id)
);

COMMENT ON TABLE proyecto_alumno IS 'Inscripción alumno↔proyecto; un alumno en un solo proyecto por año';

CREATE INDEX idx_proyecto_alumno_alumno ON proyecto_alumno(alumno_id);


-- Trigger: one project per student per academic year
CREATE OR REPLACE FUNCTION trg_unique_proyecto_alumno_anio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_year CHAR(9);
BEGIN
    SELECT academic_year INTO v_year
    FROM   proyecto
    WHERE  id = NEW.proyecto_id;

    IF EXISTS (
        SELECT 1
        FROM   proyecto_alumno pa
        JOIN   proyecto p ON p.id = pa.proyecto_id
        WHERE  pa.alumno_id = NEW.alumno_id
          AND  p.academic_year = v_year
          AND  pa.proyecto_id <> NEW.proyecto_id
    ) THEN
        RAISE EXCEPTION
            'El alumno % ya pertenece a un proyecto en el curso %',
            NEW.alumno_id, v_year;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proyecto_alumno_anio
    BEFORE INSERT ON proyecto_alumno
    FOR EACH ROW EXECUTE FUNCTION trg_unique_proyecto_alumno_anio();


-- =============================================================================
-- Rubric
-- =============================================================================

CREATE TABLE rubrica (
    id              SERIAL      PRIMARY KEY,
    modulo_id       INT         NOT NULL REFERENCES modulo(id)
                                    ON DELETE RESTRICT
                                    ON UPDATE CASCADE,
    profesor_id     INT         NOT NULL REFERENCES profesor(id)
                                    ON DELETE RESTRICT
                                    ON UPDATE CASCADE,
    academic_year   CHAR(9)     NOT NULL
                                CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    nombre          VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (modulo_id, academic_year)
);

COMMENT ON TABLE  rubrica              IS 'Rúbrica de evaluación: una por módulo y año académico';
COMMENT ON COLUMN rubrica.nombre       IS 'Título opcional; si NULL se muestra el nombre del módulo';
COMMENT ON COLUMN rubrica.academic_year IS 'Permite rúbricas distintas cada curso aunque cambie el profesor';

CREATE INDEX idx_rubrica_modulo        ON rubrica(modulo_id);
CREATE INDEX idx_rubrica_profesor      ON rubrica(profesor_id);
CREATE INDEX idx_rubrica_academic_year ON rubrica(academic_year);


CREATE TABLE rubrica_item (
    id          SERIAL      PRIMARY KEY,
    rubrica_id  INT         NOT NULL REFERENCES rubrica(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,
    descripcion TEXT        NOT NULL,
    orden       SMALLINT    NOT NULL CHECK (orden > 0),

    UNIQUE (rubrica_id, orden)
);

COMMENT ON TABLE rubrica_item IS 'Ítem (criterio) de evaluación dentro de una rúbrica';

CREATE INDEX idx_rubrica_item_rubrica ON rubrica_item(rubrica_id);


CREATE TABLE rubrica_nivel (
    id          SERIAL      PRIMARY KEY,
    rubrica_id  INT         NOT NULL REFERENCES rubrica(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,
    nombre      VARCHAR(40) NOT NULL,
    orden       SMALLINT    NOT NULL CHECK (orden > 0),

    UNIQUE (rubrica_id, orden)
);

COMMENT ON TABLE  rubrica_nivel       IS 'Nivel de desempeño dentro de una rúbrica (p.ej. Excelente, Bien)';
COMMENT ON COLUMN rubrica_nivel.orden IS '1 = mejor nivel, N = peor nivel (orden visual descendente)';

CREATE INDEX idx_rubrica_nivel_rubrica ON rubrica_nivel(rubrica_id);


-- rubrica_item × rubrica_nivel matrix cell
CREATE TABLE rubrica_item_nivel (
    rubrica_item_id     INT             NOT NULL REFERENCES rubrica_item(id)
                                            ON DELETE CASCADE ON UPDATE CASCADE,
    rubrica_nivel_id    INT             NOT NULL REFERENCES rubrica_nivel(id)
                                            ON DELETE CASCADE ON UPDATE CASCADE,
    valor               NUMERIC(5,2)    NOT NULL CHECK (valor >= 0),

    PRIMARY KEY (rubrica_item_id, rubrica_nivel_id)
);

COMMENT ON TABLE  rubrica_item_nivel       IS 'Celda de la matriz ítem×nivel: valor numérico independiente por celda';
COMMENT ON COLUMN rubrica_item_nivel.valor IS 'Puntuación obtenida al seleccionar este nivel para este ítem';

CREATE INDEX idx_rubrica_item_nivel_nivel ON rubrica_item_nivel(rubrica_nivel_id);


-- Trigger: item and nivel must belong to the same rubrica
CREATE OR REPLACE FUNCTION trg_item_nivel_misma_rubrica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_rubrica_item  INT;
    v_rubrica_nivel INT;
BEGIN
    SELECT rubrica_id INTO v_rubrica_item
    FROM   rubrica_item  WHERE id = NEW.rubrica_item_id;

    SELECT rubrica_id INTO v_rubrica_nivel
    FROM   rubrica_nivel WHERE id = NEW.rubrica_nivel_id;

    IF v_rubrica_item IS DISTINCT FROM v_rubrica_nivel THEN
        RAISE EXCEPTION
            'El ítem % y el nivel % pertenecen a rúbricas distintas',
            NEW.rubrica_item_id, NEW.rubrica_nivel_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_item_nivel_rubrica
    BEFORE INSERT OR UPDATE ON rubrica_item_nivel
    FOR EACH ROW EXECUTE FUNCTION trg_item_nivel_misma_rubrica();


-- =============================================================================
-- Corrections
-- =============================================================================

CREATE TABLE correccion (
    id              SERIAL          PRIMARY KEY,
    alumno_id       INT             NOT NULL REFERENCES alumno(id)
                                        ON DELETE RESTRICT ON UPDATE CASCADE,
    modulo_id       INT             NOT NULL REFERENCES modulo(id)
                                        ON DELETE RESTRICT ON UPDATE CASCADE,
    rubrica_id      INT             NOT NULL REFERENCES rubrica(id)
                                        ON DELETE RESTRICT ON UPDATE CASCADE,
    academic_year   CHAR(9)         NOT NULL
                                    CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    nota_final      NUMERIC(4,2)    NOT NULL
                                    CHECK (nota_final BETWEEN 0 AND 10),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    UNIQUE (alumno_id, modulo_id, academic_year)
);

COMMENT ON TABLE  correccion              IS 'Nota final de un alumno en un módulo para un año académico';
COMMENT ON COLUMN correccion.nota_final   IS 'Normalizada a 0–10: SUM(valores elegidos) / SUM(máximos por ítem) × 10';
COMMENT ON COLUMN correccion.academic_year IS 'Denormalizado desde rubrica.academic_year para constraint y consultas directas';

CREATE INDEX idx_correccion_alumno        ON correccion(alumno_id);
CREATE INDEX idx_correccion_modulo        ON correccion(modulo_id);
CREATE INDEX idx_correccion_rubrica       ON correccion(rubrica_id);
CREATE INDEX idx_correccion_academic_year ON correccion(academic_year);


-- Item-level breakdown (one row per item per correction)
CREATE TABLE correccion_item (
    correccion_id       INT NOT NULL REFERENCES correccion(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    rubrica_item_id     INT NOT NULL REFERENCES rubrica_item(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    rubrica_nivel_id    INT NOT NULL REFERENCES rubrica_nivel(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,

    PRIMARY KEY (correccion_id, rubrica_item_id),

    FOREIGN KEY (rubrica_item_id, rubrica_nivel_id)
        REFERENCES rubrica_item_nivel(rubrica_item_id, rubrica_nivel_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE correccion_item IS 'Nivel elegido por ítem; permite recalcular nota_final en cualquier momento';

CREATE INDEX idx_correccion_item_item  ON correccion_item(rubrica_item_id);
CREATE INDEX idx_correccion_item_nivel ON correccion_item(rubrica_nivel_id);


-- =============================================================================
-- Seed data
-- =============================================================================

-- Default admin user (password must be changed on first login)
-- Password: 'changeme' — hashed with bcrypt cost 10
INSERT INTO profesor (username, password_hash, rol)
VALUES ('admin', crypt('changeme', gen_salt('bf', 10)), 'admin');
