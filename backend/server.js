const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://127.0.0.1:5501'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'survey_data',
    password: 'Sripost@123',
    port: 5432,
});

async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();

        // Create submissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                name TEXT,
                age INTEGER,
                gender TEXT,
                education TEXT,
                occupation TEXT,
                income_level TEXT,
                weight REAL,
                height REAL,
                bmi TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create user_sessions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                uuid TEXT PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE
            )
        `);

        // Create dietary_preferences table
        await client.query(`
            CREATE TABLE IF NOT EXISTS dietary_preferences (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                myplate TEXT,
                foodpyramid TEXT,
                dietaryguidelines TEXT,
                learn_source TEXT,
                myplate_includes TEXT,
                balancedmeals TEXT,
                foodgroups TEXT,
                foodgroups_list TEXT,
                servings TEXT,
                foodpyramid_base TEXT,
                preference_reason TEXT,
                barrier TEXT,
                practical TEXT,
                diet_type TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_dietary_submission_id constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_dietary_submission_id'
                ) THEN
                    ALTER TABLE dietary_preferences
                    ADD CONSTRAINT unique_dietary_submission_id UNIQUE (submission_id);
                END IF;
            END $$;
        `);
        console.log('Verified unique_dietary_submission_id constraint on dietary_preferences table');

        // Create physical_activity table
        await client.query(`
            CREATE TABLE IF NOT EXISTS physical_activity (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                aware_physical TEXT,
                engage_daily TEXT,
                activity_type TEXT,
                duration TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_physical_submission_id constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_physical_submission_id'
                ) THEN
                    ALTER TABLE physical_activity
                    ADD CONSTRAINT unique_physical_submission_id UNIQUE (submission_id);
                END IF;
            END $$;
        `);
        console.log('Verified unique_physical_submission_id constraint on physical_activity table');

        // Create food_frequency table
        await client.query(`
            CREATE TABLE IF NOT EXISTS food_frequency (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                food_group TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_food_freq constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_food_freq'
                ) THEN
                    ALTER TABLE food_frequency
                    ADD CONSTRAINT unique_food_freq UNIQUE (submission_id, food_group);
                END IF;
            END $$;
        `);
        console.log('Verified unique_food_freq constraint on food_frequency table');

        // Create top_two_items table
        await client.query(`
            CREATE TABLE IF NOT EXISTS top_two_items (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                item_type TEXT,
                item_value TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_top_two constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_top_two'
                ) THEN
                    ALTER TABLE top_two_items
                    ADD CONSTRAINT unique_top_two UNIQUE (submission_id, item_type);
                END IF;
            END $$;
        `);
        console.log('Verified unique_top_two constraint on top_two_items table');

        // Create meal_items table
        await client.query(`
            CREATE TABLE IF NOT EXISTS meal_items (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                meal_time TEXT,
                recall_date DATE,
                item TEXT,
                quantity REAL,
                unit TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_meal_item constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_meal_item'
                ) THEN
                    ALTER TABLE meal_items
                    ADD CONSTRAINT unique_meal_item UNIQUE (submission_id, meal_time, item);
                END IF;
            END $$;
        `);
        console.log('Verified unique_meal_item constraint on meal_items table');

        // Create saved_sections table
        await client.query(`
            CREATE TABLE IF NOT EXISTS saved_sections (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                section TEXT,
                saved BOOLEAN DEFAULT TRUE,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add unique_section constraint with IF NOT EXISTS
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_section'
                ) THEN
                    ALTER TABLE saved_sections
                    ADD CONSTRAINT unique_section UNIQUE (submission_id, section);
                END IF;
            END $$;
        `);
        console.log('Verified unique_section constraint on saved_sections table');

        console.log('Connected to PostgreSQL and tables verified');
    } catch (err) {
        console.error('Error initializing database:', err.message, err.stack);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

initializeDatabase();

// Explicit CORS options
app.options('/api/submit', cors());
app.options('/api/data', cors());
app.options('/api/save-section', cors());

app.post('/api/save-section', async (req, res) => {
    console.log('Registering route: POST /api/save-section');
    const { uuid, section, data } = req.body;
    if (!uuid || !section || !data) {
        console.error('Invalid or missing parameters:', req.body);
        return res.status(400).json({ message: 'UUID, section, and data are required' });
    }
    console.log(`Received section save request: UUID=${uuid}, Section=${section}`);

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Check if UUID exists
        const existing = await client.query(
            'SELECT submission_id FROM user_sessions WHERE LOWER(uuid) = LOWER($1)',
            [uuid]
        );
        let submissionId;
        if (existing.rows.length > 0) {
            submissionId = existing.rows[0].submission_id;
        } else {
            const submissionResult = await client.query(
                'INSERT INTO submissions (name, age, gender, education, occupation, income_level, weight, height, bmi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
                ['', null, '', '', '', '', 0, 0, '0']
            );
            submissionId = submissionResult.rows[0].id;
            await client.query(
                'INSERT INTO user_sessions (uuid, submission_id) VALUES ($1, $2) ON CONFLICT (uuid) DO NOTHING',
                [uuid, submissionId]
            );
        }

        // Save section-specific data
        switch (section) {
            case 'demographic':
                await client.query(
                    `UPDATE submissions SET
                        name = $1, age = $2, gender = $3, education = $4, occupation = $5,
                        income_level = $6, submission_date = CURRENT_TIMESTAMP
                    WHERE id = $7`,
                    [
                        data.name || '',
                        data.age && data.age !== '' ? parseInt(data.age) || null : null,
                        data.gender || '',
                        data.education || '',
                        data.occupation || '',
                        data.income_level || '',
                        submissionId
                    ]
                );
                break;
            case 'anthropometry':
                const weight = data.weight && data.weight !== '' ? parseFloat(data.weight) || 0 : 0;
                const heightCm = data.height && data.height !== '' ? parseFloat(data.height) || 0 : 0;
                const bmi = heightCm > 0 && weight > 0 ? (weight / ((heightCm / 100) * (heightCm / 100))).toFixed(2) : '0';
                await client.query(
                    `UPDATE submissions SET
                        weight = $1, height = $2, bmi = $3, submission_date = CURRENT_TIMESTAMP
                    WHERE id = $4`,
                    [weight, heightCm, bmi, submissionId]
                );
                break;
            case 'dietary':
                const learnSource = (data.myplate === 'yes' || data.foodpyramid === 'yes' || data.dietaryguidelines === 'yes') ? (data.learn_source || '') : '';
                await client.query(
                    `INSERT INTO dietary_preferences 
                    (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, 
                     myplate_includes, balancedmeals, foodgroups, foodgroups_list, 
                     servings, foodpyramid_base, preference_reason, barrier, practical, diet_type) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
                    ON CONFLICT ON CONSTRAINT unique_dietary_submission_id 
                    DO UPDATE SET 
                        myplate = $2, foodpyramid = $3, dietaryguidelines = $4, learn_source = $5, 
                        myplate_includes = $6, balancedmeals = $7, foodgroups = $8, foodgroups_list = $9, 
                        servings = $10, foodpyramid_base = $11, preference_reason = $12, barrier = $13, 
                        practical = $14, diet_type = $15, submission_date = CURRENT_TIMESTAMP`,
                    [
                        submissionId,
                        data.myplate || 'no',
                        data.foodpyramid || 'no',
                        data.dietaryguidelines || 'no',
                        learnSource,
                        data.myplate_includes || '',
                        data.balancedmeals || 'no',
                        data.foodgroups || 'no',
                        data.foodgroups_list || '',
                        data.servings || 'no',
                        data.foodpyramid_base || '',
                        data.preference_reason || '',
                        data.barrier || '',
                        data.practical || 'no',
                        data.diet_type || ''
                    ]
                );
                break;
            case 'physical':
                const engageDaily = data.engage_daily || 'no';
                console.log(`Saving physical activity: engage_daily=${engageDaily}, frequency=${data.frequency || ''}`);
                await client.query(
                    `INSERT INTO physical_activity 
                    (submission_id, aware_physical, engage_daily, activity_type, duration, frequency) 
                    VALUES ($1, $2, $3, $4, $5, $6) 
                    ON CONFLICT ON CONSTRAINT unique_physical_submission_id 
                    DO UPDATE SET 
                        aware_physical = $2, engage_daily = $3, activity_type = $4, 
                        duration = $5, frequency = $6, submission_date = CURRENT_TIMESTAMP`,
                    [
                        submissionId,
                        data.aware_physical || 'no',
                        engageDaily,
                        engageDaily === 'yes' ? (data.activity_type || '') : '',
                        engageDaily === 'yes' ? (data.duration || '') : '',
                        engageDaily === 'yes' ? (data.frequency || '') : ''
                    ]
                );
                break;
            case 'frequency':
                for (const [group, frequency] of Object.entries(data)) {
                    if (frequency) {
                        await client.query(
                            `INSERT INTO food_frequency (submission_id, food_group, frequency) 
                            VALUES ($1, $2, $3) 
                            ON CONFLICT ON CONSTRAINT unique_food_freq 
                            DO UPDATE SET frequency = $3, submission_date = CURRENT_TIMESTAMP`,
                            [submissionId, group, frequency]
                        );
                    }
                }
                break;
            case 'food-items':
                for (const [key, value] of Object.entries(data)) {
                    if (value && value !== 'none') {
                        await client.query(
                            `INSERT INTO top_two_items (submission_id, item_type, item_value) 
                            VALUES ($1, $2, $3) 
                            ON CONFLICT ON CONSTRAINT unique_top_two 
                            DO UPDATE SET item_value = $3, submission_date = CURRENT_TIMESTAMP`,
                            [submissionId, key, value]
                        );
                    }
                }
                break;
            default:
                throw new Error(`Invalid section: ${section}`);
        }

        // Mark section as saved
        await client.query(
            `INSERT INTO saved_sections (submission_id, section, saved) 
            VALUES ($1, $2, $3) 
            ON CONFLICT ON CONSTRAINT unique_section 
            DO UPDATE SET saved = $3, submission_date = CURRENT_TIMESTAMP`,
            [submissionId, section, true]
        );

        await client.query('COMMIT');
        console.log(`Section ${section} saved with submission ID: ${submissionId}`);
        res.json({ message: `Section ${section} saved successfully` });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error(`Error saving section ${section}:`, err.message, err.stack);
        res.status(500).json({ message: `Failed to save section ${section}`, error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.post('/api/submit', async (req, res) => {
    console.log('Starting POST /api/submit');
    const formData = req.body;
    if (!formData || !formData.uuid) {
        console.error('Missing UUID or formData:', req.body);
        return res.status(400).json({ message: 'Need a valid UUID' });
    }
    console.log('Got formData:', JSON.stringify(formData, null, 2));

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Ensure all sections exist with defaults
        const submissions = formData.submissions || {};
        const dietary_preferences = formData.dietary_preferences || {};
        const physical_activity = formData.physical_activity || {};
        const food_frequency = formData.food_frequency || {};
        const top_two_items = formData.top_two_items || {};
        const meal_items = formData.meal_items || { recall1: [], items1: {}, quantities1: {}, units1: {} };

        // Validate and parse submissions data
        console.log('Validating submissions data');
        const weight = submissions.weight && submissions.weight !== '' ? parseFloat(submissions.weight) || 0 : 0;
        const heightCm = submissions.height && submissions.height !== '' ? parseFloat(submissions.height) || 0 : 0;
        const bmi = heightCm > 0 && weight > 0 ? (weight / ((heightCm / 100) * (heightCm / 100))).toFixed(2) : '0';
        const age = submissions.age && submissions.age !== '' ? parseInt(submissions.age) || null : null;

        console.log('Checking for existing UUID');
        const existing = await client.query(
            'SELECT submission_id FROM user_sessions WHERE LOWER(uuid) = LOWER($1)',
            [formData.uuid]
        );
        let submissionId;
        if (existing.rows.length > 0) {
            submissionId = existing.rows[0].submission_id;
            console.log('Updating existing submission ID:', submissionId);
            await client.query(
                `UPDATE submissions SET
                    name = $1, age = $2, gender = $3, education = $4, occupation = $5,
                    income_level = $6, weight = $7, height = $8, bmi = $9,
                    submission_date = CURRENT_TIMESTAMP
                WHERE id = $10`,
                [
                    submissions.name || '',
                    age,
                    submissions.gender || '',
                    submissions.education || '',
                    submissions.occupation || '',
                    submissions.income_level || '',
                    weight,
                    heightCm,
                    bmi,
                    submissionId
                ]
            );
            await client.query('DELETE FROM dietary_preferences WHERE submission_id = $1', [submissionId]);
            await client.query('DELETE FROM physical_activity WHERE submission_id = $1', [submissionId]);
            await client.query('DELETE FROM food_frequency WHERE submission_id = $1', [submissionId]);
            await client.query('DELETE FROM top_two_items WHERE submission_id = $1', [submissionId]);
            await client.query('DELETE FROM meal_items WHERE submission_id = $1', [submissionId]);
            await client.query('DELETE FROM saved_sections WHERE submission_id = $1', [submissionId]);
        } else {
            console.log('Creating new submission for UUID:', formData.uuid);
            const submissionResult = await client.query(
                'INSERT INTO submissions (name, age, gender, education, occupation, income_level, weight, height, bmi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
                [
                    submissions.name || '',
                    age,
                    submissions.gender || '',
                    submissions.education || '',
                    submissions.occupation || '',
                    submissions.income_level || '',
                    weight,
                    heightCm,
                    bmi
                ]
            );
            submissionId = submissionResult.rows[0].id;
            await client.query(
                'INSERT INTO user_sessions (uuid, submission_id) VALUES ($1, $2) ON CONFLICT (uuid) DO NOTHING',
                [formData.uuid, submissionId]
            );
        }
        console.log(`Processed submission with ID: ${submissionId}`);

        // Insert dietary_preferences
        console.log('Inserting dietary_preferences');
        const learnSource = (dietary_preferences.myplate === 'yes' || dietary_preferences.foodpyramid === 'yes' || dietary_preferences.dietaryguidelines === 'yes') ? (dietary_preferences.learn_source || '') : '';
        await client.query(
            `INSERT INTO dietary_preferences 
            (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, 
             myplate_includes, balancedmeals, foodgroups, foodgroups_list, 
             servings, foodpyramid_base, preference_reason, barrier, practical, diet_type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
            ON CONFLICT ON CONSTRAINT unique_dietary_submission_id 
            DO UPDATE SET 
                myplate = $2, foodpyramid = $3, dietaryguidelines = $4, learn_source = $5, 
                myplate_includes = $6, balancedmeals = $7, foodgroups = $8, foodgroups_list = $9, 
                servings = $10, foodpyramid_base = $11, preference_reason = $12, barrier = $13, 
                practical = $14, diet_type = $15, submission_date = CURRENT_TIMESTAMP`,
            [
                submissionId,
                dietary_preferences.myplate || 'no',
                dietary_preferences.foodpyramid || 'no',
                dietary_preferences.dietaryguidelines || 'no',
                learnSource,
                dietary_preferences.myplate_includes || '',
                dietary_preferences.balancedmeals || 'no',
                dietary_preferences.foodgroups || 'no',
                dietary_preferences.foodgroups_list || '',
                dietary_preferences.servings || 'no',
                dietary_preferences.foodpyramid_base || '',
                dietary_preferences.preference_reason || '',
                dietary_preferences.barrier || '',
                dietary_preferences.practical || 'no',
                dietary_preferences.diet_type || ''
            ]
        );

        // Insert physical_activity
        console.log('Inserting physical_activity');
        const engageDaily = physical_activity.engage_daily || 'no';
        console.log(`Physical activity: engage_daily=${engageDaily}, frequency=${physical_activity.frequency || ''}`);
        await client.query(
            `INSERT INTO physical_activity 
            (submission_id, aware_physical, engage_daily, activity_type, duration, frequency) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                submissionId,
                physical_activity.aware_physical || null,
                engageDaily,
                engageDaily === 'yes' ? (physical_activity.activity_type || null) : null,
                engageDaily === 'yes' ? (physical_activity.duration || null) : null,
                engageDaily === 'yes' ? (physical_activity.frequency || null) : null
            ]
        );

        // Insert food_frequency
        console.log('Inserting food_frequency');
        const foodGroups = {
            cereal_milled: food_frequency.cereal_milled || '',
            cereal_whole: food_frequency.cereal_whole || '',
            pulses: food_frequency.pulses || '',
            green_leafy: food_frequency.green_leafy || '',
            other_veg: food_frequency.other_veg || '',
            roots_tubers: food_frequency.roots_tubers || '',
            fruits: food_frequency.fruits || '',
            nuts_seeds: food_frequency.nuts_seeds || '',
            milk_products: food_frequency.milk_products || '',
            meat_products: food_frequency.meat_products || '',
            sugary_bev: food_frequency.sugary_bev || '',
            confectionery: food_frequency.confectionery || '',
            fried_foods: food_frequency.fried_foods || '',
            packaged_snacks: food_frequency.packaged_snacks || '',
            pizzas_burgers: food_frequency.pizzas_burgers || '',
            sugars: food_frequency.sugars || ''
        };
        for (const [group, frequency] of Object.entries(foodGroups)) {
            if (typeof frequency === 'string' && frequency.trim()) {
                console.log(`Inserting food_frequency for group: ${group}, frequency: ${frequency}`);
                await client.query(
                    `INSERT INTO food_frequency (submission_id, food_group, frequency) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT ON CONSTRAINT unique_food_freq 
                    DO UPDATE SET frequency = $3, submission_date = CURRENT_TIMESTAMP`,
                    [submissionId, group, frequency]
                );
            } else {
                console.log(`Skipping food_frequency for group: ${group}, invalid or empty frequency: ${frequency}`);
            }
        }

        // Insert top_two_items
        console.log('Inserting top_two_items');
        for (const [itemType, itemValue] of Object.entries(top_two_items)) {
            if (typeof itemValue === 'string' && itemValue.trim() && itemValue !== 'none') {
                console.log(`Inserting top_two_items for item_type: ${itemType}, item_value: ${itemValue}`);
                await client.query(
                    `INSERT INTO top_two_items (submission_id, item_type, item_value) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT ON CONSTRAINT unique_top_two 
                    DO UPDATE SET item_value = $3, submission_date = CURRENT_TIMESTAMP`,
                    [submissionId, itemType, itemValue]
                );
            } else {
                console.log(`Skipping top_two_items for item_type: ${itemType}, empty or invalid item_value: ${itemValue}`);
            }
        }

        // Insert meal_items using string date
        console.log('Inserting meal_items');
        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        let insertedMealItems = 0;
        for (const [index, mealTime] of mealTimes.entries()) {
            const recallDate = meal_items.recall1 && Array.isArray(meal_items.recall1) && meal_items.recall1[index]
                ? meal_items.recall1[index] // Use string as-is, no TMZ
                : null;
            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (recallDate && !dateRegex.test(recallDate)) {
                console.warn(`Invalid date format for ${mealTime}: ${recallDate}`);
                continue;
            }
            const items = meal_items.items1 && meal_items.items1[mealTime] && Array.isArray(meal_items.items1[mealTime]) ? meal_items.items1[mealTime].filter(item => typeof item === 'string' && item.trim()) : [];
            const quantities = meal_items.quantities1 && meal_items.quantities1[mealTime] && Array.isArray(meal_items.quantities1[mealTime]) ? meal_items.quantities1[mealTime] : [];
            const units = meal_items.units1 && meal_items.units1[mealTime] && Array.isArray(meal_items.units1[mealTime]) ? meal_items.units1[mealTime] : [];
            console.log(`Checking meal: ${mealTime}, date=${recallDate}, items=${items.length}, quantities=${quantities.length}, units=${units.length}`);

            if (!recallDate || !items.length || items.length !== quantities.length || items.length !== units.length) {
                console.log(`Skipping ${mealTime}: no valid date or mismatched items/quantities/units`);
                continue;
            }

            const maxItems = Math.min(items.length, 10);
            for (let i = 0; i < maxItems; i++) {
                const item = items[i];
                const quantity = quantities[i] && quantities[i] !== '' ? parseFloat(quantities[i]) : null;
                const unit = units[i] || null;
                if (!item || isNaN(quantity) || quantity === null || !unit) {
                    console.log(`Skipping bad item in ${mealTime}: item=${item}, quantity=${quantity}, unit=${unit}`);
                    continue;
                }
                console.log(`Saving meal: ${mealTime}, item=${item}, date=${recallDate}, quantity=${quantity}, unit=${unit}`);
                await client.query(
                    `INSERT INTO meal_items (submission_id, meal_time, recall_date, item, quantity, unit) 
                    VALUES ($1, $2, $3, $4, $5, $6) 
                    ON CONFLICT ON CONSTRAINT unique_meal_item 
                    DO UPDATE SET recall_date = $3, quantity = $5, unit = $6, submission_date = CURRENT_TIMESTAMP`,
                    [submissionId, mealTime, recallDate, item, quantity, unit]
                );
                insertedMealItems++;
            }
        }
        console.log(`Saved ${insertedMealItems} meal items`);

        // Mark all sections as saved
        console.log('Marking sections as saved');
        const sections = ['demographic', 'anthropometry', 'dietary', 'physical', 'frequency', 'food-items', 'meal-recall'];
        for (const section of sections) {
            console.log(`Inserting saved_sections for section: ${section}`);
            await client.query(
                `INSERT INTO saved_sections (submission_id, section, saved) 
                VALUES ($1, $2, $3) 
                ON CONFLICT ON CONSTRAINT unique_section 
                DO UPDATE SET saved = $3, submission_date = CURRENT_TIMESTAMP`,
                [submissionId, section, true]
            );
        }

        await client.query('COMMIT');
        console.log('Data saved with ID:', submissionId);
        res.json({ message: 'Data saved successfully' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Save error:', err.message, err.stack);
        console.error('FormData:', JSON.stringify(formData, null, 2));
        res.status(500).json({ message: 'Failed to save data to database', error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.get('/api/data', async (req, res) => {
    console.log('Registering route: GET /api/data');
    const { uuid } = req.query;
    if (!uuid) {
        console.error('Missing UUID in /api/data request');
        return res.status(400).json({ message: 'UUID is required' });
    }
    console.log('Fetching data for UUID:', uuid);
    try {
        const result = await pool.query(`
            SELECT 
                us.uuid, s.submission_date,
                s.name, s.age, s.gender, s.education, s.occupation, s.income_level,
                s.weight, s.height, s.bmi,
                dp.myplate, dp.foodpyramid, dp.dietaryguidelines, dp.learn_source, dp.myplate_includes,
                dp.balancedmeals, dp.foodgroups, dp.foodgroups_list, dp.servings, dp.foodpyramid_base,
                dp.preference_reason, dp.barrier, dp.practical, dp.diet_type,
                pa.aware_physical, pa.engage_daily, pa.activity_type, pa.duration, pa.frequency,
                ff.food_group, ff.frequency,
                tti.item_type, tti.item_value,
                mi.meal_time, mi.recall_date, mi.item AS mi_item, mi.quantity AS mi_quantity, mi.unit AS mi_unit,
                ss.section AS saved_section, ss.saved
            FROM user_sessions us
            LEFT JOIN submissions s ON us.submission_id = s.id
            LEFT JOIN dietary_preferences dp ON s.id = dp.submission_id
            LEFT JOIN physical_activity pa ON s.id = pa.submission_id
            LEFT JOIN food_frequency ff ON s.id = ff.submission_id
            LEFT JOIN top_two_items tti ON s.id = tti.submission_id
            LEFT JOIN meal_items mi ON s.id = mi.submission_id
            LEFT JOIN saved_sections ss ON s.id = ss.submission_id
            WHERE LOWER(us.uuid) = LOWER($1)
        `, [uuid]);

        console.log(`Query for UUID ${uuid} returned ${result.rows.length} rows`);
        if (result.rows.length === 0) {
            console.log('No data found for UUID:', uuid);
            return res.json([]);
        }

        const data = {
            uuid: result.rows[0].uuid,
            submission_date: result.rows[0].submission_date,
            submissions: {
                name: result.rows[0].name || '',
                age: result.rows[0].age !== null ? result.rows[0].age.toString() : '',
                gender: result.rows[0].gender || '',
                education: result.rows[0].education || '',
                occupation: result.rows[0].occupation || '',
                income_level: result.rows[0].income_level || '',
                weight: result.rows[0].weight !== null ? result.rows[0].weight.toString() : '',
                height: result.rows[0].height !== null ? result.rows[0].height.toString() : '',
                bmi: result.rows[0].bmi || ''
            },
            dietary_preferences: {
                myplate: result.rows[0].myplate || 'no',
                foodpyramid: result.rows[0].foodpyramid || 'no',
                dietaryguidelines: result.rows[0].dietaryguidelines || 'no',
                learn_source: result.rows[0].learn_source || '',
                myplate_includes: result.rows[0].myplate_includes || '',
                balancedmeals: result.rows[0].balancedmeals || 'no',
                foodgroups: result.rows[0].foodgroups || 'no',
                foodgroups_list: result.rows[0].foodgroups_list || '',
                servings: result.rows[0].servings || 'no',
                foodpyramid_base: result.rows[0].foodpyramid_base || '',
                preference_reason: result.rows[0].preference_reason || '',
                barrier: result.rows[0].barrier || '',
                practical: result.rows[0].practical || 'no',
                diet_type: result.rows[0].diet_type || ''
            },
            physical_activity: {
                aware_physical: result.rows[0].aware_physical || 'no',
                engage_daily: result.rows[0].engage_daily || 'no',
                activity_type: result.rows[0].activity_type || '',
                duration: result.rows[0].duration || '',
                frequency: result.rows[0].frequency || ''
            },
            food_frequency: {},
            top_two_items: {},
            meal_items: {
                recall1: Array(7).fill(null),
                items1: {},
                quantities1: {},
                units1: {}
            },
            savedSections: {}
        };

        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        mealTimes.forEach(mealTime => {
            data.meal_items.items1[mealTime] = [];
            data.meal_items.quantities1[mealTime] = [];
            data.meal_items.units1[mealTime] = [];
        });

        // Aggregate data
        result.rows.forEach(row => {
            if (row.food_group) {
                data.food_frequency[row.food_group] = row.frequency || '';
            }
            if (row.item_type) {
                data.top_two_items[row.item_type] = row.item_value || '';
            }
            if (row.meal_time && mealTimes.includes(row.meal_time)) {
                const index = mealTimes.indexOf(row.meal_time);
                if (row.recall_date && !data.meal_items.recall1[index]) {
                    data.meal_items.recall1[index] = row.recall_date; // Use date as string
                }
                if (row.mi_item) {
                    data.meal_items.items1[row.meal_time].push(row.mi_item || '');
                }
                if (row.mi_quantity !== null) {
                    data.meal_items.quantities1[row.meal_time].push(row.mi_quantity.toString());
                }
                if (row.mi_unit) {
                    data.meal_items.units1[row.meal_time].push(row.mi_unit || '');
                }
            }
            if (row.saved_section) {
                data.savedSections[row.saved_section] = row.saved || false;
            }
        });

        console.log(`Fetched data for UUID: ${uuid}, frequency: ${data.physical_activity.frequency}`);
        res.json([data]);
    } catch (err) {
        console.error('Error fetching data from PostgreSQL:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch data', error: err.message });
    }
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});