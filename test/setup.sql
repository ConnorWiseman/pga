CREATE TABLE testing (
  id           SERIAL                NOT NULL,
  unique_name  CHARACTER VARYING(64) NOT NULL,
  regular_name CHARACTER VARYING(64) NOT NULL,
  CONSTRAINT testing_primary_key PRIMARY KEY (id),
  CONSTRAINT testing_unique_name UNIQUE      (unique_name)
);

INSERT INTO testing (unique_name, regular_name)
  VALUES ('One',   'One'),
         ('Two',   'Two'),
         ('Three', 'Three');
