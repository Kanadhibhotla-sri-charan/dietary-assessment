
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://localhost:*'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

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
        console.log('Connected to PostgreSQL');

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                uuid UUID PRIMARY KEY,
                session_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (uuid, session_id)
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_uuid ON user_sessions (uuid);
        `);
        console.log('User_sessions table and index verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                submission_id UUID PRIMARY KEY REFERENCES user_sessions(uuid) ON DELETE CASCADE,
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
        console.log('Submissions table verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS dietary_preferences (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
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
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (submission_id)
            )
        `);
        console.log('Dietary_preferences table verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS physical_activity (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
                aware_physical TEXT,
                engage_daily TEXT,
                activity_type TEXT,
                duration TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (submission_id)
            )
        `);
        console.log('Physical_activity table verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS food_frequency (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
                food_group TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (submission_id, food_group)
            )
        `);
        console.log('Food_frequency table verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS top_two_items (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
                item_type TEXT,
                item_value TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (submission_id, item_type)
            )
        `);
        console.log('Top_two_items table verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS meal_items (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
                meal_time TEXT,
                item TEXT,
                quantity REAL,
                unit TEXT,
                recall_date TEXT,
                recall_type TEXT CHECK (recall_type IN ('day1', 'day2')),
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_meal_items_submission_id ON meal_items (submission_id, recall_type, recall_date);
        `);
        console.log('Meal_items table and index verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS saved_sections (
                id SERIAL PRIMARY KEY,
                submission_id UUID REFERENCES user_sessions(uuid) ON DELETE CASCADE,
                section TEXT,
                saved BOOLEAN DEFAULT TRUE,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (submission_id, section)
            )
        `);
        console.log('Saved_sections table verified');

        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing database:', err.message);
        throw err;
    } finally {
        if (client) client.release();
    }
}

async function connectWithRetry(maxRetries = 5, delay = 5000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await initializeDatabase();
            return;
        } catch (err) {
            console.error(`Connection attempt ${i + 1} failed:`, err.message);
            if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    console.error('Failed to connect to database after retries');
    process.exit(1);
}
connectWithRetry();

app.options('/api/submit', cors());
app.options('/api/data', cors());
app.options('/api/save-section', cors());
app.options('/api/save-all-sections', cors());

function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function deduplicateMealItems(items, quantities, units) {
    const seen = new Map();
    const dedupedItems = [];
    const dedupedQuantities = [];
    const dedupedUnits = [];

    items.forEach((item, i) => {
        const key = (item || '').trim();
        if (!key) return;
        if (!seen.has(key)) {
            seen.set(key, {
                item: key,
                quantity: quantities[i] && quantities[i] !== '' ? parseFloat(quantities[i]) || 0 : 0,
                unit: units[i] || 'cups'
            });
        }
    });

    seen.forEach(value => {
        dedupedItems.push(value.item);
        dedupedQuantities.push(value.quantity);
        dedupedUnits.push(value.unit);
    });

    console.log(`Deduplicated ${items.length} items to ${dedupedItems.length} items`);
    return { dedupedItems, dedupedQuantities, dedupedUnits };
}

function validateRecallDate(recallDate, section) {
    if (!recallDate) throw new Error(`Recall date is required for ${section}`);
    if (!recallDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Invalid date format for ${section}: expected YYYY-MM-DD`);
    }
    const date = new Date(recallDate + 'T00:00:00Z');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (isNaN(date.getTime()) || date >= today) {
        throw new Error(`Recall date for ${section} must be a valid past date`);
    }
    return recallDate;
}

function validateNumeric(value, field, min, max) {
    if (value === '' || value === null || value === undefined) return null;
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
        throw new Error(`Invalid ${field}: must be between ${min} and ${max}`);
    }
    return num;
}

function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function getSavedSections(client, uuid) {
    const result = await client.query(
        'SELECT section, saved FROM saved_sections WHERE submission_id = $1',
        [uuid]
    );
    const savedSections = {};
    result.rows.forEach(row => {
        savedSections[row.section] = row.saved;
    });
    return savedSections;
}

app.post('/api/save-section', async (req, res) => {
    console.log('POST /api/save-section');
    const startTime = Date.now();
    const { uuid, section, data, session_id } = req.body;
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    if (!uuid || !section || !data) {
        console.error('Missing parameters:', req.body);
        return res.status(400).json({ message: 'UUID, section, and data are required' });
    }
    if (!validateUUID(uuid)) {
        console.error('Invalid UUID format:', uuid);
        return res.status(400).json({ message: 'Invalid UUID format' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT session_id FROM user_sessions WHERE uuid = $1',
            [uuid]
        );

        let currentSessionId;
        if (existing.rows.length) {
            currentSessionId = session_id && session_id === existing.rows[0].session_id ? session_id : existing.rows[0].session_id;
        } else {
            currentSessionId = session_id || generateSessionId();
            await client.query(
                'INSERT INTO user_sessions (uuid, session_id) VALUES ($1, $2)',
                [uuid, currentSessionId]
            );
        }

        if (section === 'dietary') {
            await client.query('DELETE FROM dietary_preferences WHERE submission_id = $1', [uuid]);
        } else if (section === 'physical') {
            await client.query('DELETE FROM physical_activity WHERE submission_id = $1', [uuid]);
        } else if (section === 'frequency') {
            await client.query('DELETE FROM food_frequency WHERE submission_id = $1', [uuid]);
        } else if (section === 'food-items') {
            await client.query('DELETE FROM top_two_items WHERE submission_id = $1', [uuid]);
        } else if (section === 'meal-recall' || section === 'meal-recall-day2') {
            const recallType = section === 'meal-recall' ? 'day1' : 'day2';
            await client.query('DELETE FROM meal_items WHERE submission_id = $1 AND recall_type = $2', [uuid, recallType]);
        }

        switch (section) {
            case 'demographic':
                const age = validateNumeric(data.age, 'age', 0, 120);
                await client.query(
                    `INSERT INTO submissions (submission_id, name, age, gender, education, occupation, income_level)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (submission_id)
                    DO UPDATE SET
                        name = $2, age = $3, gender = $4, education = $5, occupation = $6,
                        income_level = $7, submission_date = CURRENT_TIMESTAMP`,
                    [
                        uuid,
                        data.name || '',
                        age,
                        data.gender || '',
                        data.education || '',
                        data.occupation || '',
                        data.income_level || ''
                    ]
                );
                break;
            case 'anthropometry':
                const weight = validateNumeric(data.weight, 'weight', 0, 500);
                const heightCm = validateNumeric(data.height, 'height', 0, 300);
                const bmi = heightCm > 0 && weight > 0 ? (weight / ((heightCm / 100) * (heightCm / 100))).toFixed(2) : '0';
                await client.query(
                    `INSERT INTO submissions (submission_id, weight, height, bmi)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (submission_id)
                    DO UPDATE SET
                        weight = $2, height = $3, bmi = $4, submission_date = CURRENT_TIMESTAMP`,
                    [uuid, weight || 0, heightCm || 0, bmi]
                );
                break;
            case 'dietary':
                const learnSource = (data.myplate === 'yes' || data.foodpyramid === 'yes' || data.dietaryguidelines === 'yes') ? data.learn_source || '' : '';
                await client.query(
                    `INSERT INTO dietary_preferences 
                    (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, 
                     myplate_includes, balancedmeals, foodgroups, foodgroups_list, 
                     servings, foodpyramid_base, preference_reason, barrier, practical, diet_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                    [
                        uuid,
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
                await client.query(
                    `INSERT INTO physical_activity 
                    (submission_id, aware_physical, engage_daily, activity_type, duration, frequency)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        uuid,
                        data.aware_physical || 'no',
                        engageDaily,
                        engageDaily === 'yes' ? data.activity_type || '' : '',
                        engageDaily === 'yes' ? data.duration || '' : '',
                        engageDaily === 'yes' ? data.frequency || '' : ''
                    ]
                );
                break;
            case 'frequency':
                for (const [group, frequency] of Object.entries(data)) {
                    if (frequency) {
                        await client.query(
                            `INSERT INTO food_frequency (submission_id, food_group, frequency)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (submission_id, food_group)
                            DO UPDATE SET frequency = $3, submission_date = CURRENT_TIMESTAMP`,
                            [uuid, group, frequency]
                        );
                    }
                }
                break;
            case 'food-items':
                for (const [key, value] of Object.entries(data)) {
                    if (value) {
                        await client.query(
                            `INSERT INTO top_two_items (submission_id, item_type, item_value)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (submission_id, item_type)
                            DO UPDATE SET item_value = $3, submission_date = CURRENT_TIMESTAMP`,
                            [uuid, key, value]
                        );
                    }
                }
                break;
            case 'meal-recall':
            case 'meal-recall-day2':
                console.log(`Validating recall_date for ${section}:`, data.recall_date);
                if (!data.recall_date) throw new Error(`Recall date is required for ${section}`);
                const validatedDate = validateRecallDate(data.recall_date, section);
                const recallType = section === 'meal-recall' ? 'day1' : 'day2';
                const itemsObj = data.items || {};
                console.log(`Items object for ${section}:`, JSON.stringify(itemsObj, null, 2));
                if (typeof itemsObj !== 'object') throw new Error(`Invalid items format for ${section}`);
                let insertedItems = 0;
                for (const mealTime of Object.keys(itemsObj)) {
                    const items = Array.isArray(itemsObj[mealTime]) ? itemsObj[mealTime].filter(item => item && item.trim()) : [];
                    const quantities = Array.isArray(data.quantities?.[mealTime]) ? data.quantities[mealTime] : [];
                    const units = Array.isArray(data.units?.[mealTime]) ? data.units[mealTime] : [];
                    const recallDate = validatedDate;
                    if (!items.length) {
                        console.log(`Skipping ${mealTime} for ${section}: no items`);
                        continue;
                    }
                    console.log(`Processing ${items.length} items for ${mealTime}`);
                    const { dedupedItems, dedupedQuantities, dedupedUnits } = deduplicateMealItems(items, quantities, units);
                    const maxItems = Math.min(dedupedItems.length, 10);
                    for (let i = 0; i < maxItems; i++) {
                        const item = dedupedItems[i];
                        if (item) {
                            await client.query(
                                `INSERT INTO meal_items (submission_id, meal_time, item, quantity, unit, recall_date, recall_type)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                                [uuid, mealTime, item, dedupedQuantities[i], dedupedUnits[i], recallDate, recallType]
                            );
                            insertedItems++;
                        }
                    }
                }
                console.log(`Inserted ${insertedItems} meal items for ${section}`);
                if (insertedItems === 0) {
                    throw new Error(`No valid items provided for ${section}`);
                }
                break;
            default:
                throw new Error(`Invalid section: ${section}`);
        }

        await client.query(
            `INSERT INTO saved_sections (submission_id, section, saved)
            VALUES ($1, $2, $3)
            ON CONFLICT (submission_id, section)
            DO UPDATE SET saved = $3, submission_date = CURRENT_TIMESTAMP`,
            [uuid, section, true]
        );

        const savedSections = await getSavedSections(client, uuid);
        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        const response = {
            message: `Section ${section} saved successfully`,
            section,
            session_id: currentSessionId,
            uuid,
            savedSections
        };
        console.log(`Section ${section} saved: UUID=${uuid}, SessionID=${currentSessionId}, Duration=${duration}ms, Response:`, JSON.stringify(response, null, 2));
        res.status(200).json(response);
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error(`Error saving section ${section}:`, err.message);
        res.status(400).json({ message: `Failed to save section ${section}`, error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.post('/api/save-all-sections', async (req, res) => {
    console.log('POST /api/save-all-sections');
    const { uuid, sections, session_id } = req.body;
    if (!uuid || !sections || typeof sections !== 'object') {
        console.error('Missing parameters:', req.body);
        return res.status(400).json({ message: 'UUID and sections object are required' });
    }
    if (!validateUUID(uuid)) {
        console.error('Invalid UUID format:', uuid);
        return res.status(400).json({ message: 'Invalid UUID format' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT session_id FROM user_sessions WHERE uuid = $1',
            [uuid]
        );

        let currentSessionId;
        if (existing.rows.length) {
            currentSessionId = session_id && session_id === existing.rows[0].session_id ? session_id : existing.rows[0].session_id;
        } else {
            currentSessionId = session_id || generateSessionId();
            await client.query(
                'INSERT INTO user_sessions (uuid, session_id) VALUES ($1, $2)',
                [uuid, currentSessionId]
            );
        }

        await client.query('DELETE FROM dietary_preferences WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM physical_activity WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM food_frequency WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM top_two_items WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM saved_sections WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM meal_items WHERE submission_id = $1', [uuid]);

        for (const [section, data] of Object.entries(sections)) {
            if (!data) {
                console.warn(`Skipping empty section: ${section}`);
                continue;
            }
            console.log(`Processing section: ${section}`);

            switch (section) {
                case 'demographic':
                    const age = validateNumeric(data.age, 'age', 0, 120);
                    await client.query(
                        `INSERT INTO submissions (submission_id, name, age, gender, education, occupation, income_level)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (submission_id)
                        DO UPDATE SET
                            name = $2, age = $3, gender = $4, education = $5, occupation = $6,
                            income_level = $7, submission_date = CURRENT_TIMESTAMP`,
                        [
                            uuid,
                            data.name || '',
                            age,
                            data.gender || '',
                            data.education || '',
                            data.occupation || '',
                            data.income_level || ''
                        ]
                    );
                    break;
                case 'anthropometry':
                    const weight = validateNumeric(data.weight, 'weight', 0, 500);
                    const heightCm = validateNumeric(data.height, 'height', 0, 300);
                    const bmi = heightCm > 0 && weight > 0 ? (weight / ((heightCm / 100) * (heightCm / 100))).toFixed(2) : '0';
                    await client.query(
                        `INSERT INTO submissions (submission_id, weight, height, bmi)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (submission_id)
                        DO UPDATE SET
                            weight = $2, height = $3, bmi = $4, submission_date = CURRENT_TIMESTAMP`,
                        [uuid, weight || 0, heightCm || 0, bmi]
                    );
                    break;
                case 'dietary':
                    const learnSource = (data.myplate === 'yes' || data.foodpyramid === 'yes' || data.dietaryguidelines === 'yes') ? data.learn_source || '' : '';
                    await client.query(
                        `INSERT INTO dietary_preferences 
                        (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, 
                         myplate_includes, balancedmeals, foodgroups, foodgroups_list, 
                         servings, foodpyramid_base, preference_reason, barrier, practical, diet_type)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                        [
                            uuid,
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
                    await client.query(
                        `INSERT INTO physical_activity 
                        (submission_id, aware_physical, engage_daily, activity_type, duration, frequency)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            uuid,
                            data.aware_physical || 'no',
                            engageDaily,
                            engageDaily === 'yes' ? data.activity_type || '' : '',
                            engageDaily === 'yes' ? data.duration || '' : '',
                            engageDaily === 'yes' ? data.frequency || '' : ''
                        ]
                    );
                    break;
                case 'frequency':
                    for (const [group, frequency] of Object.entries(data)) {
                        if (frequency) {
                            await client.query(
                                `INSERT INTO food_frequency (submission_id, food_group, frequency)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (submission_id, food_group)
                                DO UPDATE SET frequency = $3, submission_date = CURRENT_TIMESTAMP`,
                                [uuid, group, frequency]
                            );
                        }
                    }
                    break;
                case 'food-items':
                    for (const [key, value] of Object.entries(data)) {
                        if (value) {
                            await client.query(
                                `INSERT INTO top_two_items (submission_id, item_type, item_value)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (submission_id, item_type)
                                DO UPDATE SET item_value = $3, submission_date = CURRENT_TIMESTAMP`,
                                [uuid, key, value]
                            );
                        }
                    }
                    break;
                case 'meal-recall':
                    if (!data.recall_date) {
                        console.warn(`Skipping ${section}: No recall date provided`);
                        continue;
                    }
                    const validatedDate1 = validateRecallDate(data.recall_date, section);
                    const recallType1 = 'day1';
                    const itemsObj1 = data.items || {};
                    if (typeof itemsObj1 !== 'object') throw new Error(`Invalid items format for ${section}`);
                    let insertedItems1 = 0;
                    for (const mealTime of Object.keys(itemsObj1)) {
                        const items = Array.isArray(itemsObj1[mealTime]) ? itemsObj1[mealTime].filter(item => item && item.trim()) : [];
                        const quantities = Array.isArray(data.quantities?.[mealTime]) ? data.quantities[mealTime] : [];
                        const units = Array.isArray(data.units?.[mealTime]) ? data.units[mealTime] : [];
                        const recallDate = validatedDate1;

                        if (!items.length) {
                            console.log(`Skipping ${mealTime} for ${section}: no items`);
                            continue;
                        }

                        const { dedupedItems, dedupedQuantities, dedupedUnits } = deduplicateMealItems(items, quantities, units);
                        const maxItems = Math.min(dedupedItems.length, 10);
                        for (let i = 0; i < maxItems; i++) {
                            const item = dedupedItems[i];
                            if (item) {
                                await client.query(
                                    `INSERT INTO meal_items (submission_id, meal_time, item, quantity, unit, recall_date, recall_type)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                                    [uuid, mealTime, item, dedupedQuantities[i], dedupedUnits[i], recallDate, recallType1]
                                );
                                insertedItems1++;
                            }
                        }
                    }
                    console.log(`Inserted ${insertedItems1} meal items for ${section}`);
                    break;
                case 'meal-recall-day2':
                    if (!data.recall_date || !data.recall_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        console.warn(`Skipping ${section}: No valid recall date provided`);
                        continue;
                    }
                    try {
                        const validatedDate2 = validateRecallDate(data.recall_date, section);
                        const recallType2 = 'day2';
                        const itemsObj2 = data.items || {};
                        if (typeof itemsObj2 !== 'object') throw new Error(`Invalid items format for ${section}`);
                        let insertedItems2 = 0;
                        for (const mealTime of Object.keys(itemsObj2)) {
                            const items = Array.isArray(itemsObj2[mealTime]) ? itemsObj2[mealTime].filter(item => item && item.trim()) : [];
                            const quantities = Array.isArray(data.quantities?.[mealTime]) ? data.quantities[mealTime] : [];
                            const units = Array.isArray(data.units?.[mealTime]) ? data.units[mealTime] : [];
                            const recallDate = validatedDate2;

                            if (!items.length) {
                                console.log(`Skipping ${mealTime} for ${section}: no items`);
                                continue;
                            }

                            const { dedupedItems, dedupedQuantities, dedupedUnits } = deduplicateMealItems(items, quantities, units);
                            const maxItems = Math.min(dedupedItems.length, 10);
                            for (let i = 0; i < maxItems; i++) {
                                const item = dedupedItems[i];
                                if (item) {
                                    await client.query(
                                        `INSERT INTO meal_items (submission_id, meal_time, item, quantity, unit, recall_date, recall_type)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                                        [uuid, mealTime, item, dedupedQuantities[i], dedupedUnits[i], recallDate, recallType2]
                                    );
                                    insertedItems2++;
                                }
                            }
                        }
                        console.log(`Inserted ${insertedItems2} meal items for ${section}`);
                    } catch (err) {
                        console.warn(`Skipping ${section} due to validation error: ${err.message}`);
                        continue;
                    }
                    break;
                default:
                    console.warn(`Skipping unknown section: ${section}`);
                    continue;
            }

            await client.query(
                `INSERT INTO saved_sections (submission_id, section, saved)
                VALUES ($1, $2, $3)
                ON CONFLICT (submission_id, section)
                DO UPDATE SET saved = $3, submission_date = CURRENT_TIMESTAMP`,
                [uuid, section, true]
            );
        }

        const savedSections = await getSavedSections(client, uuid);
        await client.query('COMMIT');

        console.log(`All sections saved: UUID=${uuid}, SessionID=${currentSessionId}`);
        res.status(200).json({
            message: 'All sections saved successfully',
            sections: Object.keys(sections),
            session_id: currentSessionId,
            uuid,
            savedSections
        });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error saving all sections:', err.message);
        res.status(400).json({ message: 'Failed to save all sections', error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.post('/api/submit', async (req, res) => {
    console.log('POST /api/submit');
    const { uuid, session_id, ...formData } = req.body;
    if (!uuid || !formData) {
        console.error('Missing parameters:', req.body);
        return res.status(400).json({ message: 'UUID and form data are required' });
    }
    if (!validateUUID(uuid)) {
        console.error('Invalid UUID format:', uuid);
        return res.status(400).json({ message: 'Invalid UUID format' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT session_id FROM user_sessions WHERE uuid = $1',
            [uuid]
        );

        let currentSessionId;
        if (existing.rows.length) {
            currentSessionId = session_id && session_id === existing.rows[0].session_id ? session_id : existing.rows[0].session_id;
        } else {
            currentSessionId = session_id || generateSessionId();
            await client.query(
                'INSERT INTO user_sessions (uuid, session_id) VALUES ($1, $2)',
                [uuid, currentSessionId]
            );
        }

        await client.query('DELETE FROM submissions WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM dietary_preferences WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM physical_activity WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM food_frequency WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM top_two_items WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM meal_items WHERE submission_id = $1', [uuid]);
        await client.query('DELETE FROM saved_sections WHERE submission_id = $1', [uuid]);

        const submissions = formData.submissions || {};
        const dietary_preferences = formData.dietary_preferences || {};
        const physical_activity = formData.physical_activity || {};
        const food_frequency = formData.food_frequency || {};
        const top_two_items = formData.top_two_items || {};
        const meal_items = formData.meal_items || {
            recall1: [], items1: {}, quantities1: {}, units1: {},
            recall2: [], items2: {}, quantities2: {}, units2: {}
        };

        const weight = validateNumeric(submissions.weight, 'weight', 0, 500) || 0;
        const heightCm = validateNumeric(submissions.height, 'height', 0, 300) || 0;
        const bmi = heightCm > 0 && weight > 0 ? (weight / ((heightCm / 100) * (heightCm / 100))).toFixed(2) : '0';
        const age = validateNumeric(submissions.age, 'age', 0, 120);

        await client.query(
            `INSERT INTO submissions 
            (submission_id, name, age, gender, education, occupation, income_level, weight, height, bmi)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                uuid,
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

        const learnSource = (dietary_preferences.myplate === 'yes' || dietary_preferences.foodpyramid === 'yes' || dietary_preferences.dietaryguidelines === 'yes') ? dietary_preferences.learn_source || '' : '';
        await client.query(
            `INSERT INTO dietary_preferences 
            (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, 
             myplate_includes, balancedmeals, foodgroups, foodgroups_list, 
             servings, foodpyramid_base, preference_reason, barrier, practical, diet_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                uuid,
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

        const engageDaily = physical_activity.engage_daily || 'no';
        await client.query(
            `INSERT INTO physical_activity 
            (submission_id, aware_physical, engage_daily, activity_type, duration, frequency)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                uuid,
                physical_activity.aware_physical || 'no',
                engageDaily,
                engageDaily === 'yes' ? physical_activity.activity_type || '' : '',
                engageDaily === 'yes' ? physical_activity.duration || '' : '',
                engageDaily === 'yes' ? physical_activity.frequency || '' : ''
            ]
        );

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
            if (frequency && frequency.trim()) {
                await client.query(
                    `INSERT INTO food_frequency (submission_id, food_group, frequency)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (submission_id, food_group)
                    DO UPDATE SET frequency = $3, submission_date = CURRENT_TIMESTAMP`,
                    [uuid, group, frequency]
                );
            }
        }

        for (const [itemType, itemValue] of Object.entries(top_two_items)) {
            if (itemValue && itemValue.trim()) {
                await client.query(
                    `INSERT INTO top_two_items (submission_id, item_type, item_value)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (submission_id, item_type)
                    DO UPDATE SET item_value = $3, submission_date = CURRENT_TIMESTAMP`,
                    [uuid, itemType, itemValue]
                );
            }
        }

        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        let insertedMealItems = 0;

        const processMealItems = async (recall, itemsObj, quantitiesObj, unitsObj, day) => {
            if (!recall || !recall[0]) return;
            const validatedDate = validateRecallDate(recall[0], `meal-recall-day${day}`);
            const recallType = day === 1 ? 'day1' : 'day2';
            for (const mealTime of mealTimes) {
                const items = itemsObj?.[mealTime] && Array.isArray(itemsObj[mealTime])
                    ? itemsObj[mealTime].filter(item => item && item.trim())
                    : [];
                const quantities = quantitiesObj?.[mealTime] && Array.isArray(quantitiesObj[mealTime])
                    ? quantitiesObj[mealTime]
                    : [];
                const units = unitsObj?.[mealTime] && Array.isArray(unitsObj[mealTime])
                    ? unitsObj[mealTime]
                    : [];
                const recallDate = validatedDate;

                if (!items.length) {
                    console.log(`Skipping ${mealTime} for Day-${day}: no items`);
                    continue;
                }

                const { dedupedItems, dedupedQuantities, dedupedUnits } = deduplicateMealItems(items, quantities, units);
                const maxItems = Math.min(dedupedItems.length, 10);
                for (let i = 0; i < maxItems; i++) {
                    const item = dedupedItems[i];
                    if (item) {
                        await client.query(
                            `INSERT INTO meal_items (submission_id, meal_time, item, quantity, unit, recall_date, recall_type)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [uuid, mealTime, item, dedupedQuantities[i], dedupedUnits[i], recallDate, recallType]
                        );
                        insertedMealItems++;
                    }
                }
            }
        };

        await processMealItems(
            meal_items.recall1,
            meal_items.items1,
            meal_items.quantities1,
            meal_items.units1,
            1
        );
        await processMealItems(
            meal_items.recall2,
            meal_items.items2,
            meal_items.quantities2,
            meal_items.units2,
            2
        );
        console.log(`Saved ${insertedMealItems} meal items`);

        const sections = ['demographic', 'anthropometry', 'dietary', 'physical', 'frequency', 'food-items', 'meal-recall', 'meal-recall-day2'];
        for (const section of sections) {
            await client.query(
                `INSERT INTO saved_sections (submission_id, section, saved)
                VALUES ($1, $2, $3)
                ON CONFLICT (submission_id, section)
                DO UPDATE SET saved = $3, submission_date = CURRENT_TIMESTAMP`,
                [uuid, section, true]
            );
        }

        const savedSections = await getSavedSections(client, uuid);
        await client.query('COMMIT');

        console.log(`Data submitted: UUID=${uuid}, SessionID=${currentSessionId}`);
        res.status(200).json({
            message: 'Data saved successfully',
            session_id: currentSessionId,
            uuid,
            savedSections
        });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error submitting data:', err.message);
        res.status(400).json({ message: 'Failed to save data', error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.get('/api/data', async (req, res) => {
    console.log('GET /api/data');
    const { uuid, session_id } = req.query;
    if (!uuid) {
        console.error('Missing UUID');
        return res.status(400).json({ message: 'UUID is required' });
    }
    if (!validateUUID(uuid)) {
        console.error('Invalid UUID format:', uuid);
        return res.status(400).json({ message: 'Invalid UUID format' });
    }

    let client;
    try {
        client = await pool.connect();

        let mealItemsQuery = `
            SELECT DISTINCT
                mi.meal_time, mi.item AS mi_item, mi.quantity AS mi_quantity, mi.unit AS mi_unit,
                mi.recall_date, mi.recall_type
            FROM meal_items mi
            WHERE mi.submission_id = $1
            ORDER BY mi.recall_type, mi.recall_date, mi.meal_time
        `;
        const mealItemsParams = [uuid];
        if (session_id) {
            mealItemsQuery = `
                SELECT DISTINCT
                    mi.meal_time, mi.item AS mi_item, mi.quantity AS mi_quantity, mi.unit AS mi_unit,
                    mi.recall_date, mi.recall_type
                FROM meal_items mi
                JOIN user_sessions us ON mi.submission_id = us.uuid
                WHERE mi.submission_id = $1 AND us.session_id = $2
                ORDER BY mi.recall_type, mi.recall_date, mi.meal_time
            `;
            mealItemsParams.push(session_id);
        }
        const mealItemsResult = await pool.query(mealItemsQuery, mealItemsParams);

        let queryText = `
            SELECT 
                us.uuid, us.session_id, s.submission_date,
                s.name, s.age, s.gender, s.education, s.occupation, s.income_level,
                s.weight, s.height, s.bmi,
                dp.myplate, dp.foodpyramid, dp.dietaryguidelines, dp.learn_source, dp.myplate_includes,
                dp.balancedmeals, dp.foodgroups, dp.foodgroups_list, dp.servings, dp.foodpyramid_base,
                dp.preference_reason, dp.barrier, dp.practical, dp.diet_type,
                pa.aware_physical, pa.engage_daily, pa.activity_type, pa.duration, pa.frequency AS pa_frequency,
                ff.food_group, ff.frequency AS ff_frequency,
                tti.item_type, tti.item_value,
                ss.section AS saved_section, ss.saved
            FROM user_sessions us
            LEFT JOIN submissions s ON s.submission_id = us.uuid
            LEFT JOIN dietary_preferences dp ON dp.submission_id = us.uuid
            LEFT JOIN physical_activity pa ON pa.submission_id = us.uuid
            LEFT JOIN food_frequency ff ON ff.submission_id = us.uuid
            LEFT JOIN top_two_items tti ON tti.submission_id = us.uuid
            LEFT JOIN saved_sections ss ON ss.submission_id = us.uuid
            WHERE us.uuid = $1
        `;
        const queryParams = [uuid];

        if (session_id) {
            queryText += ' AND us.session_id = $2';
            queryParams.push(session_id);
        }

        const result = await pool.query(queryText, queryParams);

        if (result.rows.length === 0 && mealItemsResult.rows.length === 0) {
            console.log('No data found for UUID:', uuid);
            return res.status(200).json([]);
        }

        const data = {
            uuid: result.rows[0]?.uuid || uuid,
            session_id: result.rows[0]?.session_id || session_id,
            submission_date: result.rows[0]?.submission_date || null,
            submissions: {
                name: result.rows[0]?.name || '',
                age: result.rows[0]?.age !== null ? result.rows[0].age.toString() : '',
                gender: result.rows[0]?.gender || '',
                education: result.rows[0]?.education || '',
                occupation: result.rows[0]?.occupation || '',
                income_level: result.rows[0]?.income_level || '',
                weight: result.rows[0]?.weight !== null ? result.rows[0].weight.toString() : '',
                height: result.rows[0]?.height !== null ? result.rows[0].height.toString() : '',
                bmi: result.rows[0]?.bmi || ''
            },
            dietary_preferences: {
                myplate: result.rows[0]?.myplate || '',
                foodpyramid: result.rows[0]?.foodpyramid || '',
                dietaryguidelines: result.rows[0]?.dietaryguidelines || '',
                learn_source: result.rows[0]?.learn_source || '',
                myplate_includes: result.rows[0]?.myplate_includes || '',
                balancedmeals: result.rows[0]?.balancedmeals || '',
                foodgroups: result.rows[0]?.foodgroups || '',
                foodgroups_list: result.rows[0]?.foodgroups_list || '',
                servings: result.rows[0]?.servings || '',
                foodpyramid_base: result.rows[0]?.foodpyramid_base || '',
                preference_reason: result.rows[0]?.preference_reason || '',
                barrier: result.rows[0]?.barrier || '',
                practical: result.rows[0]?.practical || '',
                diet_type: result.rows[0]?.diet_type || ''
            },
            physical_activity: {
                aware_physical: result.rows[0]?.aware_physical || '',
                engage_daily: result.rows[0]?.engage_daily || '',
                activity_type: result.rows[0]?.activity_type || '',
                duration: result.rows[0]?.duration || '',
                frequency: result.rows[0]?.pa_frequency || ''
            },
            food_frequency: {},
            top_two_items: {},
            meal_items: {
                recall1: Array(7).fill(null),
                items1: {},
                quantities1: {},
                units1: {},
                recall2: Array(7).fill(null),
                items2: {},
                quantities2: {},
                units2: {}
            },
            savedSections: {}
        };

        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        ['items1', 'quantities1', 'units1', 'items2', 'quantities2', 'units2'].forEach(key => {
            mealTimes.forEach(mealTime => {
                data.meal_items[key][mealTime] = [];
            });
        });

        const day1Rows = mealItemsResult.rows.filter(row => row.recall_type === 'day1' && row.recall_date);
        const day2Rows = mealItemsResult.rows.filter(row => row.recall_type === 'day2' && row.recall_date);
        if (day1Rows.length > 0) {
            data.meal_items.recall1 = Array(7).fill(day1Rows[0].recall_date);
        }
        if (day2Rows.length > 0) {
            data.meal_items.recall2 = Array(7).fill(day2Rows[0].recall_date);
        }

        mealItemsResult.rows.forEach(row => {
            const dayKey = row.recall_type === 'day1' ? '1' : '2';
            if (row.mi_item && mealTimes.includes(row.meal_time)) {
                data.meal_items[`items${dayKey}`][row.meal_time].push(row.mi_item);
            }
            if (row.mi_quantity !== null && mealTimes.includes(row.meal_time)) {
                data.meal_items[`quantities${dayKey}`][row.meal_time].push(row.mi_quantity.toString());
            }
            if (row.mi_unit && mealTimes.includes(row.meal_time)) {
                data.meal_items[`units${dayKey}`][row.meal_time].push(row.mi_unit);
            }
        });

        result.rows.forEach(row => {
            if (row.food_group) {
                data.food_frequency[row.food_group] = row.ff_frequency || '';
            }
            if (row.item_type) {
                data.top_two_items[row.item_type] = row.item_value || '';
            }
            if (row.saved_section) {
                data.savedSections[row.saved_section] = row.saved || false;
            }
        });

        console.log(`Data fetched: UUID=${uuid}, SessionID=${session_id || 'latest'}`);
        res.status(200).json([data]);
    } catch (err) {
        console.error('Error fetching data:', err.message);
        res.status(400).json({ message: 'Failed to fetch data', error: err.message });
    } finally {
        if (client) client.release();
    }
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
