-- schema.sql
-- Corrector de Proyectos — PostgreSQL 16
-- Generado por: Agente 3 — Arquitecto de Requisitos
-- Feature: corrector-v1
-- Fecha: 2026-06-02

-- ============================================================
-- ÍNDICE DE CONTENIDOS
--  1.  Extensiones
--  2.  Tipos y enums
--  3.  legislaciones
--  4.  ciclos
--  5.  modulos
--  6.  profesores
--  7.  profesor_modulos  (tabla intermedia)
--  8.  alumnos
--  9.  alumno_nombres    (tabla de privacidad — nombres reales)
-- 10.  proyectos
-- 11.  proyecto_alumnos  (tabla intermedia)
-- 12.  rubrica_items
-- 13.  correcciones
-- 14.  sessions
-- 15.  Índices
-- ============================================================


-- ============================================================
-- 1. EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ============================================================
-- 2. TIPOS Y ENUMS
-- ============================================================

-- Niveles posibles en una corrección. 'mal' tiene valor monetario 0
-- pero se almacena como nivel para mantener trazabilidad en informes.
CREATE TYPE nivel_enum AS ENUM (
    'excelente',
    'muy_bien',
    'bien',
    'regular',
    'mal'
);

-- Roles del sistema. 'tutor' es un subconjunto de 'profesor' con
-- acceso restringido solo a la pantalla de notas.
CREATE TYPE rol_enum AS ENUM (
    'admin',
    'profesor',
    'tutor'
);


-- ============================================================
-- 3. LEGISLACIONES
-- ============================================================

CREATE TABLE legislaciones (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    abbreviation  VARCHAR(10)  NOT NULL,
    start_year    SMALLINT     NOT NULL CHECK (start_year BETWEEN 1900 AND 2099),
    end_year      SMALLINT     NOT NULL CHECK (end_year BETWEEN 1900 AND 2099),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_legislaciones_abbreviation UNIQUE (abbreviation),
    -- end_year debe ser exactamente start_year + 1
    CONSTRAINT chk_legislaciones_years CHECK (end_year = start_year + 1)
);


-- ============================================================
-- 4. CICLOS
-- ============================================================

CREATE TABLE ciclos (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    legislacion_id  UUID         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Borrar legislacion bloqueado si tiene ciclos (dependencia explícita).
    CONSTRAINT fk_ciclos_legislacion
        FOREIGN KEY (legislacion_id) REFERENCES legislaciones (id)
        ON DELETE RESTRICT,

    -- El mismo nombre puede existir bajo legislaciones distintas.
    CONSTRAINT uq_ciclos_name_legislacion UNIQUE (name, legislacion_id)
);


-- ============================================================
-- 5. MODULOS
-- ============================================================

CREATE TABLE modulos (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    abbreviation  VARCHAR(20)  NOT NULL,
    ciclo_id      UUID         NOT NULL,
    weekly_hours  SMALLINT     NOT NULL CHECK (weekly_hours > 0),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Borrar ciclo bloqueado si tiene módulos.
    CONSTRAINT fk_modulos_ciclo
        FOREIGN KEY (ciclo_id) REFERENCES ciclos (id)
        ON DELETE RESTRICT,

    -- Siglas únicas dentro de la legislación del ciclo.
    -- La unicidad real se aplica a nivel de aplicación cruzando con
    -- ciclos.legislacion_id; la BD la soporta mediante UNIQUE(abbreviation, ciclo_id)
    -- como aproximación — la validación exacta (por legislación) la realiza el backend.
    CONSTRAINT uq_modulos_abbreviation_ciclo UNIQUE (abbreviation, ciclo_id)
);


-- ============================================================
-- 6. PROFESORES
-- ============================================================

CREATE TABLE profesores (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username                VARCHAR(100) NOT NULL,
    nombre_completo         VARCHAR(255) NOT NULL,
    password_hash           VARCHAR(255) NOT NULL DEFAULT '$2b$10$default_hash_placeholder',
    -- password_hash usa bcrypt; el valor por defecto corresponde a '12345678'.
    -- El backend debe regenerar este hash real al crear el profesor.
    rol                     rol_enum     NOT NULL DEFAULT 'profesor',
    failed_login_attempts   SMALLINT     NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked                  BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Cuando locked = true, solo el admin puede desbloquearlo mediante
    -- el guardado del registro (UC-05). Si admin queda bloqueado,
    -- requiere intervención directa en la BD.
    password_changed        BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Indica si el profesor ya cambió su contraseña predeterminada.
    -- El frontend usa este flag para mostrar '12345678' o '********'
    -- en la tabla del admin.
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_profesores_username UNIQUE (username)
);

-- El admin es único en el sistema. Se garantiza a nivel de aplicación;
-- a nivel de BD se puede añadir un trigger si se requiere enforcement duro.


-- ============================================================
-- 7. PROFESOR_MODULOS (tabla intermedia)
-- ============================================================

CREATE TABLE profesor_modulos (
    profesor_id  UUID  NOT NULL,
    modulo_id    UUID  NOT NULL,

    PRIMARY KEY (profesor_id, modulo_id),

    CONSTRAINT fk_pm_profesor
        FOREIGN KEY (profesor_id) REFERENCES profesores (id)
        ON DELETE CASCADE,
    -- Borrar profesor en cascada elimina sus asignaciones de módulos.
    -- Borrar módulo bloqueado si tiene proyectos (se gestiona en la tabla proyectos).

    CONSTRAINT fk_pm_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos (id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 8. ALUMNOS
-- ============================================================

CREATE TABLE alumnos (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50)  NOT NULL,
    -- 'code' es el identificador anónimo visible en la UI (e.g. JJ499).
    -- El nombre real se almacena en la tabla alumno_nombres.
    ciclo_id    UUID         NOT NULL,
    -- La legislación del alumno se deriva del ciclo; no se almacena independientemente.
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_alumnos_code UNIQUE (code),

    CONSTRAINT fk_alumnos_ciclo
        FOREIGN KEY (ciclo_id) REFERENCES ciclos (id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 9. ALUMNO_NOMBRES (tabla de privacidad)
-- ============================================================

-- Almacena el nombre real del alumno separado de la tabla principal
-- para protección de datos. El acceso a esta tabla debe restringirse
-- a nivel de BD (roles de PostgreSQL) independientemente del backend.
CREATE TABLE alumno_nombres (
    alumno_id       UUID         PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,

    CONSTRAINT fk_alumno_nombres_alumno
        FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
        ON DELETE CASCADE
    -- Borrar alumno elimina en cascada su registro de nombre.
);


-- ============================================================
-- 10. PROYECTOS
-- ============================================================

CREATE TABLE proyectos (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    modulo_id       UUID         NOT NULL,
    ciclo_id        UUID         NOT NULL,
    -- ciclo_id registra el ciclo de los alumnos del proyecto.
    -- Puede diferir del ciclo del módulo si el profesor lo cambia en la UI.
    anio_academico  SMALLINT     NOT NULL,
    -- Año de inicio del curso (e.g. 2025 para 2025-2026).
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Borrar módulo bloqueado si tiene proyectos.
    CONSTRAINT fk_proyectos_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_proyectos_ciclo
        FOREIGN KEY (ciclo_id) REFERENCES ciclos (id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 11. PROYECTO_ALUMNOS (tabla intermedia)
-- ============================================================

CREATE TABLE proyecto_alumnos (
    proyecto_id  UUID      NOT NULL,
    alumno_id    UUID      NOT NULL,

    PRIMARY KEY (proyecto_id, alumno_id),

    CONSTRAINT fk_pa_proyecto
        FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
        ON DELETE CASCADE,
    -- Borrar proyecto elimina en cascada sus asignaciones de alumnos.

    CONSTRAINT fk_pa_alumno
        FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
        ON DELETE RESTRICT
    -- Borrar alumno bloqueado si está en un proyecto.
);

-- Restricción de 1-3 alumnos por proyecto se aplica a nivel de aplicación
-- (no hay un CHECK nativo de PostgreSQL eficiente para contar FK por grupo).

-- Un alumno solo puede estar en un proyecto por año académico.
-- Esta restricción se aplica a nivel de aplicación cruzando con proyectos.anio_academico.


-- ============================================================
-- 12. RUBRICA_ITEMS
-- ============================================================

CREATE TABLE rubrica_items (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id   UUID           NOT NULL,
    -- La rúbrica pertenece al módulo, no al proyecto.
    -- Todos los proyectos de un módulo comparten la misma rúbrica.
    name        VARCHAR(255)   NOT NULL,
    excelente   NUMERIC(5, 2)  NOT NULL CHECK (excelente > 0),
    muy_bien    NUMERIC(5, 2)  NOT NULL CHECK (muy_bien > 0),
    bien        NUMERIC(5, 2)  NOT NULL CHECK (bien > 0),
    regular     NUMERIC(5, 2)  NOT NULL CHECK (regular > 0),
    mal         NUMERIC(5, 2)  NOT NULL DEFAULT 0.00,
    -- 'mal' siempre es 0.00; es fixed por regla de negocio.
    orden       SMALLINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT fk_rubrica_items_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos (id)
        ON DELETE RESTRICT,

    -- Orden descendente: excelente > muy_bien > bien > regular > mal (= 0)
    CONSTRAINT chk_rubrica_grade_order
        CHECK (excelente > muy_bien AND muy_bien > bien AND bien > regular AND regular > 0),

    CONSTRAINT chk_rubrica_mal_fixed
        CHECK (mal = 0.00)
);

-- La suma de todos los 'excelente' de un módulo debe ser exactamente 10.00.
-- Esta restricción se valida a nivel de aplicación (no con un CHECK nativo)
-- porque involucra una agregación de múltiples filas.


-- ============================================================
-- 13. CORRECCIONES
-- ============================================================

CREATE TABLE correcciones (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id         UUID           NOT NULL,
    proyecto_id       UUID           NOT NULL,
    rubrica_item_id   UUID           NOT NULL,
    nivel_seleccionado nivel_enum    NOT NULL,
    puntuacion        NUMERIC(5, 2)  NOT NULL,
    -- 'puntuacion' es el valor numérico del nivel seleccionado en el momento
    -- del guardado. Se persiste para garantizar consistencia histórica en
    -- informes, aunque la rúbrica quede congelada en cuanto existe la primera corrección.
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),

    -- Una corrección es única por alumno + proyecto + ítem.
    -- Re-corregir sobrescribe (UPDATE) este registro.
    CONSTRAINT uq_correcciones_alumno_proyecto_item
        UNIQUE (alumno_id, proyecto_id, rubrica_item_id),

    CONSTRAINT fk_correcciones_alumno
        FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_correcciones_proyecto
        FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
        ON DELETE RESTRICT,
    -- Borrar proyecto bloqueado si tiene correcciones (UC-07).

    CONSTRAINT fk_correcciones_rubrica_item
        FOREIGN KEY (rubrica_item_id) REFERENCES rubrica_items (id)
        ON DELETE RESTRICT
    -- Borrar ítem de rúbrica bloqueado si tiene correcciones (UC-08).
);


-- ============================================================
-- 14. SESSIONS
-- ============================================================

-- Sesiones servidor; la cookie contiene el token (no se usa JWT).
-- Destruidas en logout; expiradas por cron o middleware de aplicación.
CREATE TABLE sessions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    profesor_id  UUID         NOT NULL,
    token        VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_sessions_token UNIQUE (token),

    CONSTRAINT fk_sessions_profesor
        FOREIGN KEY (profesor_id) REFERENCES profesores (id)
        ON DELETE CASCADE
);


-- ============================================================
-- 15. ÍNDICES
-- ============================================================

-- legislaciones
CREATE INDEX idx_legislaciones_abbreviation ON legislaciones (abbreviation);
CREATE INDEX idx_legislaciones_start_year   ON legislaciones (start_year);

-- ciclos
CREATE INDEX idx_ciclos_legislacion_id ON ciclos (legislacion_id);
CREATE INDEX idx_ciclos_name           ON ciclos (name);

-- modulos
CREATE INDEX idx_modulos_ciclo_id      ON modulos (ciclo_id);
CREATE INDEX idx_modulos_abbreviation  ON modulos (abbreviation);

-- profesores
CREATE INDEX idx_profesores_username ON profesores (username);
CREATE INDEX idx_profesores_locked   ON profesores (locked) WHERE locked = TRUE;

-- profesor_modulos
CREATE INDEX idx_pm_profesor_id ON profesor_modulos (profesor_id);
CREATE INDEX idx_pm_modulo_id   ON profesor_modulos (modulo_id);

-- alumnos
CREATE INDEX idx_alumnos_code     ON alumnos (code);
CREATE INDEX idx_alumnos_ciclo_id ON alumnos (ciclo_id);

-- alumno_nombres — no se indexa; acceso siempre por PK (alumno_id)

-- proyectos
CREATE INDEX idx_proyectos_modulo_id      ON proyectos (modulo_id);
CREATE INDEX idx_proyectos_ciclo_id       ON proyectos (ciclo_id);
CREATE INDEX idx_proyectos_anio_academico ON proyectos (anio_academico);

-- proyecto_alumnos
CREATE INDEX idx_pa_proyecto_id ON proyecto_alumnos (proyecto_id);
CREATE INDEX idx_pa_alumno_id   ON proyecto_alumnos (alumno_id);

-- rubrica_items
CREATE INDEX idx_rubrica_items_modulo_id ON rubrica_items (modulo_id);

-- correcciones
CREATE INDEX idx_correcciones_alumno_id       ON correcciones (alumno_id);
CREATE INDEX idx_correcciones_proyecto_id     ON correcciones (proyecto_id);
CREATE INDEX idx_correcciones_rubrica_item_id ON correcciones (rubrica_item_id);

-- sessions
CREATE INDEX idx_sessions_profesor_id ON sessions (profesor_id);
CREATE INDEX idx_sessions_expires_at  ON sessions (expires_at);
