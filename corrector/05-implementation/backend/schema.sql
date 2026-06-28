-- =============================================================================
-- Corrector de Proyectos — PostgreSQL 16 schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_salt / crypt for password hashing

-- No ENUM types — role domain enforced by CHECK constraint on the column.


-- =============================================================================
-- Core catalog tables
-- =============================================================================

CREATE TABLE legislation (
    id           SERIAL       PRIMARY KEY,
    name         VARCHAR(20)  NOT NULL UNIQUE,
    start_year   SMALLINT     NOT NULL CHECK (start_year > 1900),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legislation IS 'Educational legal framework (e.g. LOMLOE, LOE)';


CREATE TABLE cycle (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cycle IS 'Vocational training cycle (e.g. DAW, DAM, ASIR); name is globally unique — legislation is carried by modules, not cycles';


CREATE TABLE module (
    id              SERIAL       PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    weekly_hours    SMALLINT     NOT NULL CHECK (weekly_hours > 0),
    cycle_id        INT          NOT NULL REFERENCES cycle(id)
                                     ON DELETE RESTRICT
                                     ON UPDATE CASCADE,
    legislation_id  INT          NOT NULL REFERENCES legislation(id)
                                     ON DELETE RESTRICT
                                     ON UPDATE CASCADE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (name, cycle_id, legislation_id)
);

COMMENT ON TABLE module IS 'Vocational module within a cycle and legislation; a module name is unique within the same cycle+legislation pair';

CREATE INDEX idx_module_cycle        ON module(cycle_id);
CREATE INDEX idx_module_legislation  ON module(legislation_id);


-- =============================================================================
-- Users
-- =============================================================================

CREATE TABLE teacher (
    id                   SERIAL      PRIMARY KEY,
    username             VARCHAR(60) NOT NULL UNIQUE,
    password_hash        TEXT        NOT NULL,
    role                 VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'profesor', 'tutor')),
    must_change_password BOOLEAN     NOT NULL DEFAULT TRUE,
    tutor_cycle_id       INT         UNIQUE
                                     REFERENCES cycle(id)
                                         ON DELETE SET NULL
                                         ON UPDATE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- role='tutor'  ↔  tutor_cycle_id IS NOT NULL
    -- role='admin'  →  tutor_cycle_id IS NULL (covered by the biconditional)
    CONSTRAINT chk_tutor_cycle
        CHECK ( (role = 'tutor') = (tutor_cycle_id IS NOT NULL) )
);

COMMENT ON TABLE  teacher                      IS 'System users: admin, profesor or tutor';
COMMENT ON COLUMN teacher.password_hash        IS 'bcrypt hash — never store plaintext';
COMMENT ON COLUMN teacher.role                 IS 'Values: admin, profesor, tutor — enforced by CHECK, no ENUM';
COMMENT ON COLUMN teacher.must_change_password IS 'TRUE until the user completes the mandatory first-login password change';
COMMENT ON COLUMN teacher.tutor_cycle_id       IS 'NULL for admin and profesor; required for tutor';

CREATE INDEX idx_teacher_tutor_cycle ON teacher(tutor_cycle_id) WHERE tutor_cycle_id IS NOT NULL;


-- UNIQUE on tutor_cycle_id already prevents two tutors for the same cycle;
-- this trigger adds a descriptive error message.
CREATE OR REPLACE FUNCTION trg_max_tutors_per_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tutor_cycle_id IS NOT NULL THEN
        IF (
            SELECT COUNT(*)
            FROM   teacher
            WHERE  tutor_cycle_id = NEW.tutor_cycle_id
              AND  id <> COALESCE(NEW.id, -1)
        ) >= 1 THEN
            RAISE EXCEPTION
                'Cycle % already has a tutor assigned (max 1 allowed)',
                NEW.tutor_cycle_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_max_tutors
    BEFORE INSERT OR UPDATE OF tutor_cycle_id ON teacher
    FOR EACH ROW EXECUTE FUNCTION trg_max_tutors_per_cycle();


-- Teacher ↔ Module assignment (one teacher per module, permanent, no academic year history)
CREATE TABLE teacher_module (
    teacher_id  INT NOT NULL REFERENCES teacher(id)
                        ON DELETE CASCADE  ON UPDATE CASCADE,
    module_id   INT NOT NULL REFERENCES module(id)
                        ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (teacher_id, module_id),
    UNIQUE (module_id)  -- one teacher per module
);

COMMENT ON TABLE teacher_module IS 'Current module assignments for teachers; UNIQUE(module_id) enforces one teacher per module; no academic year — temporal context via module.legislation_id';

CREATE INDEX idx_teacher_module_module ON teacher_module(module_id);


-- =============================================================================
-- Students
-- =============================================================================

CREATE TABLE student (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    cycle_id    INT          NOT NULL REFERENCES cycle(id)
                                 ON DELETE RESTRICT
                                 ON UPDATE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  student      IS 'Student enrolled in a vocational cycle';
COMMENT ON COLUMN student.name IS 'Free text: real name or anonymised code (e.g. JJ499); no format enforced';

CREATE INDEX idx_student_cycle ON student(cycle_id);
CREATE INDEX idx_student_name  ON student(name);


-- Student ↔ Module enrollment (explicit, managed by teacher)
CREATE TABLE student_module (
    student_id  INT NOT NULL REFERENCES student(id)
                        ON DELETE CASCADE  ON UPDATE CASCADE,
    module_id   INT NOT NULL REFERENCES module(id)
                        ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (student_id, module_id)
);

COMMENT ON TABLE student_module IS 'Explicit student enrollment per module; a student in a cycle may not attend all its modules';

CREATE INDEX idx_student_module_module ON student_module(module_id);


-- =============================================================================
-- Projects
-- =============================================================================

-- No cycle_id here — the cycle is inferred via project_student → student → cycle.
CREATE TABLE project (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    academic_year CHAR(9)      NOT NULL
                               CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  project               IS 'End-of-cycle student project; cycle inferred through its members';
COMMENT ON COLUMN project.academic_year IS 'Format YYYY-YYYY e.g. 2024-2025';

CREATE INDEX idx_project_academic_year ON project(academic_year);


CREATE TABLE project_student (
    project_id  INT NOT NULL REFERENCES project(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    student_id  INT NOT NULL REFERENCES student(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (project_id, student_id)
);

COMMENT ON TABLE project_student IS 'Student membership in a project; one project per student per academic year (enforced by trigger)';

CREATE INDEX idx_project_student_student ON project_student(student_id);


-- Trigger: one project per student per academic year.
-- academic_year lives on project, not on project_student, so a plain UNIQUE is not enough.
CREATE OR REPLACE FUNCTION trg_unique_project_student_year()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_year CHAR(9);
BEGIN
    SELECT academic_year INTO v_year
    FROM   project
    WHERE  id = NEW.project_id;

    IF EXISTS (
        SELECT 1
        FROM   project_student ps
        JOIN   project p ON p.id = ps.project_id
        WHERE  ps.student_id = NEW.student_id
          AND  p.academic_year = v_year
          AND  ps.project_id <> NEW.project_id
    ) THEN
        RAISE EXCEPTION
            'Student % already belongs to a project in academic year %',
            NEW.student_id, v_year;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_student_year
    BEFORE INSERT ON project_student
    FOR EACH ROW EXECUTE FUNCTION trg_unique_project_student_year();


-- =============================================================================
-- Rubric
-- =============================================================================

-- The rubric is a module resource — no teacher_id (no owner).
CREATE TABLE rubric (
    id            SERIAL       PRIMARY KEY,
    module_id     INT          NOT NULL REFERENCES module(id)
                                   ON DELETE RESTRICT
                                   ON UPDATE CASCADE,
    academic_year CHAR(9)      NOT NULL
                               CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    name          VARCHAR(120),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (module_id, academic_year)
);

COMMENT ON TABLE  rubric               IS 'Scoring rubric: one per module per academic year; owned by the module, not by any specific teacher';
COMMENT ON COLUMN rubric.name          IS 'Optional title; if NULL the module name is shown in the UI';
COMMENT ON COLUMN rubric.academic_year IS 'Allows a different rubric each year even if the teacher changes';

CREATE INDEX idx_rubric_module        ON rubric(module_id);
CREATE INDEX idx_rubric_academic_year ON rubric(academic_year);


CREATE TABLE rubric_item (
    id            SERIAL   PRIMARY KEY,
    rubric_id     INT      NOT NULL REFERENCES rubric(id)
                               ON DELETE CASCADE
                               ON UPDATE CASCADE,
    description   TEXT     NOT NULL,
    display_order SMALLINT NOT NULL CHECK (display_order > 0),

    UNIQUE (rubric_id, display_order)
);

COMMENT ON TABLE rubric_item IS 'Evaluation criterion within a rubric';

CREATE INDEX idx_rubric_item_rubric ON rubric_item(rubric_id);


-- Levels are defined per item (irregular matrix).
-- Each item owns its own levels; there is no shared level pool across items.
CREATE TABLE rubric_level (
    id             SERIAL       PRIMARY KEY,
    rubric_item_id INT          NOT NULL REFERENCES rubric_item(id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE,
    name           VARCHAR(40)  NOT NULL,
    display_order  SMALLINT     NOT NULL CHECK (display_order > 0),
    score          NUMERIC(5,2) NOT NULL CHECK (score >= 0),

    UNIQUE (rubric_item_id, display_order),
    -- Exposes (rubric_item_id, id) as a composite unique target so that
    -- correction_item can enforce via FK that the chosen level belongs to
    -- the correct item.
    UNIQUE (rubric_item_id, id)
);

COMMENT ON TABLE  rubric_level               IS 'Performance level for a specific rubric item; each item defines its own levels independently';
COMMENT ON COLUMN rubric_level.score         IS 'Points awarded when this level is selected for this item';
COMMENT ON COLUMN rubric_level.display_order IS 'Presentation order within the item (teacher-defined)';

CREATE INDEX idx_rubric_level_item ON rubric_level(rubric_item_id);


-- =============================================================================
-- Corrections
-- =============================================================================

CREATE TABLE correction (
    id            SERIAL       PRIMARY KEY,
    student_id    INT          NOT NULL REFERENCES student(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    module_id     INT          NOT NULL REFERENCES module(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    rubric_id     INT          NOT NULL REFERENCES rubric(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    teacher_id    INT          NOT NULL REFERENCES teacher(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    academic_year CHAR(9)      NOT NULL
                               CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    final_score   NUMERIC(4,2) NOT NULL
                               CHECK (final_score BETWEEN 0 AND 10),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (student_id, module_id, academic_year)
);

COMMENT ON TABLE  correction               IS 'Final grade for a student in a module for an academic year';
COMMENT ON COLUMN correction.teacher_id    IS 'Teacher who performed the correction; preserved for audit even if teacher is later reassigned';
COMMENT ON COLUMN correction.final_score   IS 'Normalised to 0–10: SUM(selected scores) / SUM(max score per item) × 10';
COMMENT ON COLUMN correction.academic_year IS 'Denormalised from rubric.academic_year to support UNIQUE(student_id, module_id, academic_year) without a JOIN';

CREATE INDEX idx_correction_student       ON correction(student_id);
CREATE INDEX idx_correction_module        ON correction(module_id);
CREATE INDEX idx_correction_rubric        ON correction(rubric_id);
CREATE INDEX idx_correction_teacher       ON correction(teacher_id);
CREATE INDEX idx_correction_academic_year ON correction(academic_year);


-- Item-level breakdown: one row per rubric item per correction
CREATE TABLE correction_item (
    correction_id   INT NOT NULL REFERENCES correction(id)
                            ON DELETE CASCADE ON UPDATE CASCADE,
    rubric_item_id  INT NOT NULL REFERENCES rubric_item(id)
                            ON DELETE RESTRICT ON UPDATE CASCADE,
    rubric_level_id INT NOT NULL,

    PRIMARY KEY (correction_id, rubric_item_id),

    -- Composite FK guarantees the chosen level belongs to the stated item
    FOREIGN KEY (rubric_item_id, rubric_level_id)
        REFERENCES rubric_level(rubric_item_id, id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE correction_item IS 'Level chosen per item; enables recalculation of final_score at any time';

CREATE INDEX idx_correction_item_item  ON correction_item(rubric_item_id);
CREATE INDEX idx_correction_item_level ON correction_item(rubric_level_id);


-- =============================================================================
-- Seed data
-- =============================================================================

-- Default admin user (password must be changed on first login)
-- Password: '12345678' — bcrypt cost 10
INSERT INTO teacher (username, password_hash, role, must_change_password)
VALUES ('admin', crypt('12345678', gen_salt('bf', 10)), 'admin', TRUE);
