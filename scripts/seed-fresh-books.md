# Fresh Book Seed Data — Complete Reset & Reload

> **Purpose:** Clear all existing books, EPUBs, audiobooks, and related data from the database and S3 bucket, then seed a fresh catalog of 30 books with real cover images, real Project Gutenberg EPUB files, and sample audiobook entries — all uploaded to S3.

---

## Step 1: Clear Existing Data

Run these SQL commands against the production database **in order** (foreign keys):

```sql
-- 1. Remove chapter data
TRUNCATE TABLE book_chapters;

-- 2. Remove reading progress
DELETE FROM reading_progress;

-- 3. Remove reviews
DELETE FROM reviews WHERE reviewable_type = 'App\\Models\\Book';

-- 4. Remove wishlist entries
DELETE FROM wishlists;

-- 5. Remove library access records
DELETE FROM library;

-- 6. Remove order items referencing books
DELETE FROM order_items;

-- 7. Remove the books themselves
DELETE FROM books;

-- 8. Reset auto-increment
ALTER TABLE books AUTO_INCREMENT = 1;
ALTER TABLE book_chapters AUTO_INCREMENT = 1;
```

### Clear S3 Bucket

```bash
# List existing book files
aws s3 ls s3://YOUR_BUCKET_NAME/books/ --recursive

# Remove all book files (covers, epubs, audio)
aws s3 rm s3://YOUR_BUCKET_NAME/books/ --recursive

# Also remove any uploads folder content
aws s3 rm s3://YOUR_BUCKET_NAME/uploads/ --recursive
```

---

## Step 2: Download Source Files

### EPUB Files (Project Gutenberg — Public Domain)

| # | Title | Gutenberg URL | Size |
|---|-------|--------------|------|
| 1 | Pride and Prejudice | https://www.gutenberg.org/ebooks/1342.epub3.images | ~600KB |
| 2 | Alice's Adventures in Wonderland | https://www.gutenberg.org/ebooks/11.epub3.images | ~200KB |
| 3 | The Great Gatsby | https://www.gutenberg.org/ebooks/64317.epub3.images | ~400KB |
| 4 | Frankenstein | https://www.gutenberg.org/ebooks/84.epub3.images | ~500KB |
| 5 | The Art of War | https://www.gutenberg.org/ebooks/132.epub3.images | ~150KB |
| 6 | Moby Dick | https://www.gutenberg.org/ebooks/2701.epub3.images | ~700KB |
| 7 | A Tale of Two Cities | https://www.gutenberg.org/ebooks/98.epub3.images | ~500KB |
| 8 | The Count of Monte Cristo | https://www.gutenberg.org/ebooks/1184.epub3.images | ~2MB |
| 9 | Adventures of Huckleberry Finn | https://www.gutenberg.org/ebooks/76.epub3.images | ~600KB |
| 10 | Jane Eyre | https://www.gutenberg.org/ebooks/1260.epub3.images | ~800KB |
| 11 | Dracula | https://www.gutenberg.org/ebooks/345.epub3.images | ~600KB |
| 12 | The Picture of Dorian Gray | https://www.gutenberg.org/ebooks/174.epub3.images | ~400KB |
| 13 | Little Women | https://www.gutenberg.org/ebooks/514.epub3.images | ~800KB |
| 14 | The Adventures of Sherlock Holmes | https://www.gutenberg.org/ebooks/1661.epub3.images | ~500KB |
| 15 | Treasure Island | https://www.gutenberg.org/ebooks/120.epub3.images | ~400KB |
| 16 | The Odyssey | https://www.gutenberg.org/ebooks/1727.epub3.images | ~600KB |
| 17 | Crime and Punishment | https://www.gutenberg.org/ebooks/2554.epub3.images | ~900KB |
| 18 | Wuthering Heights | https://www.gutenberg.org/ebooks/768.epub3.images | ~500KB |
| 19 | Heart of Darkness | https://www.gutenberg.org/ebooks/219.epub3.images | ~200KB |
| 20 | The Prince | https://www.gutenberg.org/ebooks/1232.epub3.images | ~200KB |

### Cover Images (Use Unsplash for real, high-quality covers)

Download 200×300 cover images. Suggested approach:

```bash
# Create a covers directory
mkdir -p /tmp/book-seeds/covers

# Download placeholder covers from picsum (or use real cover art)
for i in $(seq 1 30); do
  curl -L "https://picsum.photos/seed/myscriptic-book-${i}/400/600" -o "/tmp/book-seeds/covers/book-${i}.jpg"
done
```

---

## Step 3: Upload to S3

```bash
BUCKET="YOUR_BUCKET_NAME"

# Upload covers
for i in $(seq 1 30); do
  aws s3 cp "/tmp/book-seeds/covers/book-${i}.jpg" \
    "s3://${BUCKET}/books/covers/book-${i}.jpg" \
    --content-type "image/jpeg"
done

# Upload EPUBs (download from Gutenberg first)
declare -A EPUBS=(
  [1]="https://www.gutenberg.org/ebooks/1342.epub3.images"
  [2]="https://www.gutenberg.org/ebooks/11.epub3.images"
  [3]="https://www.gutenberg.org/ebooks/64317.epub3.images"
  [4]="https://www.gutenberg.org/ebooks/84.epub3.images"
  [5]="https://www.gutenberg.org/ebooks/132.epub3.images"
  [6]="https://www.gutenberg.org/ebooks/2701.epub3.images"
  [7]="https://www.gutenberg.org/ebooks/98.epub3.images"
  [8]="https://www.gutenberg.org/ebooks/1184.epub3.images"
  [9]="https://www.gutenberg.org/ebooks/76.epub3.images"
  [10]="https://www.gutenberg.org/ebooks/1260.epub3.images"
  [11]="https://www.gutenberg.org/ebooks/345.epub3.images"
  [12]="https://www.gutenberg.org/ebooks/174.epub3.images"
  [13]="https://www.gutenberg.org/ebooks/514.epub3.images"
  [14]="https://www.gutenberg.org/ebooks/1661.epub3.images"
  [15]="https://www.gutenberg.org/ebooks/120.epub3.images"
  [16]="https://www.gutenberg.org/ebooks/1727.epub3.images"
  [17]="https://www.gutenberg.org/ebooks/2554.epub3.images"
  [18]="https://www.gutenberg.org/ebooks/768.epub3.images"
  [19]="https://www.gutenberg.org/ebooks/219.epub3.images"
  [20]="https://www.gutenberg.org/ebooks/1232.epub3.images"
)

mkdir -p /tmp/book-seeds/epubs
for i in "${!EPUBS[@]}"; do
  curl -L "${EPUBS[$i]}" -o "/tmp/book-seeds/epubs/book-${i}.epub"
  aws s3 cp "/tmp/book-seeds/epubs/book-${i}.epub" \
    "s3://${BUCKET}/books/epubs/book-${i}.epub" \
    --content-type "application/epub+zip"
done
```

---

## Step 4: Seed the Database

### Authors (create first)

```sql
-- Ensure authors exist (adjust IDs to match your users table)
-- These should be users with role='author'

INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES
('Chimamanda Adichie', 'chimamanda@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Tunde Balogun', 'tunde@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Wanjiru Mwangi', 'wanjiru@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Seun Adesanya', 'seun@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Ngozi Adeyemi', 'ngozi@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Kofi Mensah', 'kofi@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Amina Diallo', 'amina@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Efua Asante', 'efua@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Dr. Amaka Eze', 'amaka@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW()),
('Bisi Ogunwale', 'bisi@myscriptic.com', '$2y$10$hash', 'author', NOW(), NOW());
```

> **Note:** Replace `$2y$10$hash` with a real bcrypt hash, e.g. `Hash::make('password123')` in Laravel tinker.

### Books (30 books)

```sql
INSERT INTO books (
  title, author, description, sample_excerpt, category,
  access_type, format, price, currency, rating, review_count,
  is_new, is_trending,
  cover_s3_key, book_file_s3_key, audio_file_s3_key,
  chapter_count, file_format, file_size_bytes,
  status, created_at, updated_at
) VALUES

-- 1. The Lagos Chronicles (Fiction, Subscription, eBook)
(
  'The Lagos Chronicles',
  'Chimamanda Adichie',
  'A sweeping tale of love, ambition, and identity in modern Lagos. Follow three generations as they navigate the bustling streets, from the markets of Mushin to the penthouses of Victoria Island.',
  'The harmattan wind carried the scent of suya smoke across the Third Mainland Bridge as Adaeze pressed her forehead against the taxi window...',
  'Fiction',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.8, 1240,
  0, 1,
  'books/covers/book-1.jpg', 'books/epubs/book-1.epub', NULL,
  24, 'epub', 614400,
  'published', NOW(), NOW()
),

-- 2. Atomic Habits: African Edition (Self-Help, Paid, eBook)
(
  'Atomic Habits: African Edition',
  'Tunde Balogun',
  'Practical strategies for building better habits, tailored for the African professional. Drawing on research and real stories from Lagos to Nairobi.',
  'Every action you take is a vote for the type of person you wish to become. In the bustling markets of Ikeja, I learned this lesson the hard way...',
  'Self-Help',
  'PAID', 'ebook', 12.99, 'USD', 4.9, 3400,
  1, 1,
  'books/covers/book-2.jpg', 'books/epubs/book-2.epub', NULL,
  18, 'epub', 204800,
  'published', NOW(), NOW()
),

-- 3. Voices from the Savanna (Poetry, Free, eBook)
(
  'Voices from the Savanna',
  'Wanjiru Mwangi',
  'A collection of poems celebrating the vast beauty of the East African landscape, from the rolling hills of Kenya to the shores of Lake Victoria.',
  'Under the acacia tree where elephants once danced, I found my grandmother''s voice whispering through the tall grass...',
  'Poetry',
  'FREE', 'ebook', NULL, NULL, 4.6, 780,
  1, 0,
  'books/covers/book-3.jpg', 'books/epubs/book-3.epub', NULL,
  32, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 4. The Entrepreneur's Code (Business, Subscription, eBook)
(
  'The Entrepreneur''s Code',
  'Tunde Balogun',
  'Unlock the secrets of Africa''s most successful startup founders. From fintech to agriculture, discover the playbook reshaping the continent.',
  'When Tony Elumelu first spoke about Africapitalism, few understood the revolution he was igniting. Today, the evidence is everywhere...',
  'Business',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.7, 2100,
  0, 1,
  'books/covers/book-4.jpg', 'books/epubs/book-4.epub', NULL,
  20, 'epub', 512000,
  'published', NOW(), NOW()
),

-- 5. Midnight in Accra (Romance, Paid, eBook)
(
  'Midnight in Accra',
  'Efua Asante',
  'When a British-Ghanaian journalist returns to Accra to cover a political scandal, she never expects to fall for the man at the center of it all.',
  'The night air in Osu smelled of kelewele and jasmine. Ama stepped off the trotro and felt Accra wrap around her like a warm embrace...',
  'Romance',
  'PAID', 'ebook', 8.99, 'USD', 4.5, 920,
  0, 0,
  'books/covers/book-5.jpg', 'books/epubs/book-5.epub', NULL,
  22, 'epub', 194560,
  'published', NOW(), NOW()
),

-- 6. Tech Giants of Africa (Technology, Subscription, eBook)
(
  'Tech Giants of Africa',
  'Seun Adesanya',
  'The untold stories behind Africa''s biggest tech companies — from Flutterwave to Andela, Jumia to Paystack.',
  'In a small office above a cybercafé in Yaba, three engineers wrote the code that would eventually process $16 billion in transactions...',
  'Technology',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.4, 560,
  1, 0,
  'books/covers/book-6.jpg', 'books/epubs/book-6.epub', NULL,
  15, 'epub', 716800,
  'published', NOW(), NOW()
),

-- 7. The Baobab Tree (Children, Free, eBook)
(
  'The Baobab Tree',
  'Ngozi Adeyemi',
  'A heartwarming children''s story about a young girl who discovers that the ancient baobab tree in her village holds magical secrets.',
  'Little Zuri always knew the baobab was special. Every evening, when the sun painted the sky in shades of mango and papaya...',
  'Children',
  'FREE', 'ebook', NULL, NULL, 4.8, 1560,
  0, 0,
  'books/covers/book-7.jpg', 'books/epubs/book-7.epub', NULL,
  12, 'epub', 362496,
  'published', NOW(), NOW()
),

-- 8. Currency of Knowledge (Finance, Paid, Audiobook)
(
  'Currency of Knowledge',
  'Dr. Amaka Eze',
  'A comprehensive guide to personal finance for the modern African professional, covering investing, saving, and building generational wealth.',
  'Your relationship with money was formed before you were born. It was shaped by your parents'' whispered arguments about school fees...',
  'Finance',
  'PAID', 'audiobook', 19.99, 'USD', 4.3, 340,
  0, 0,
  'books/covers/book-8.jpg', NULL, 'books/audio/book-8-sample.mp3',
  16, 'mp3', 52428800,
  'published', NOW(), NOW()
),

-- 9. Sacred Grounds (Historical, Subscription, eBook)
(
  'Sacred Grounds',
  'Bisi Ogunwale',
  'The epic saga of the Oyo Empire, told through the eyes of a young historian discovering forbidden archives that rewrite everything known about West African kingdoms.',
  'The ancient scrolls were never meant to be found. Hidden behind the crumbling walls of the Alaafin''s forgotten library...',
  'Historical',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.6, 890,
  0, 1,
  'books/covers/book-9.jpg', 'books/epubs/book-9.epub', NULL,
  28, 'epub', 232448,
  'published', NOW(), NOW()
),

-- 10. Python for Data Scientists (Technology, Paid, eBook)
(
  'Python for Data Scientists',
  'Kofi Mensah',
  'Master Python for data science with practical examples from African datasets — population health, mobile money transactions, and agricultural yields.',
  'Data is the new oil, they say. But unlike oil, data doesn''t deplete. And in Africa, we sit on the richest untapped data reserves...',
  'Technology',
  'PAID', 'ebook', 24.99, 'USD', 4.7, 2800,
  1, 0,
  'books/covers/book-10.jpg', 'books/epubs/book-10.epub', NULL,
  30, 'epub', 921600,
  'published', NOW(), NOW()
),

-- 11. The River Between Us (Fiction, Subscription, Audiobook)
(
  'The River Between Us',
  'Amina Diallo',
  'Two families divided by the Niger River and united by a love that spans decades. A multigenerational story of conflict, reconciliation, and the bonds that water cannot break.',
  'The river had always been the boundary. On the east bank, the Diakités kept their traditions. On the west, the Touré clan embraced the new...',
  'Fiction',
  'SUBSCRIPTION', 'audiobook', NULL, NULL, 4.5, 670,
  0, 0,
  'books/covers/book-11.jpg', NULL, 'books/audio/book-11-sample.mp3',
  26, 'mp3', 73400320,
  'published', NOW(), NOW()
),

-- 12. Leadership in Crisis (Leadership, Subscription, eBook)
(
  'Leadership in Crisis',
  'Bisi Ogunwale',
  'Lessons from Africa''s greatest leaders during times of adversity — from Mandela to Sankara, from boardrooms in Johannesburg to peace talks in Addis Ababa.',
  'True leadership is not born in comfort. It is forged in the crucible of crisis, tempered by impossible choices...',
  'Leadership',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.8, 1100,
  0, 1,
  'books/covers/book-12.jpg', 'books/epubs/book-12.epub', NULL,
  18, 'epub', 512000,
  'published', NOW(), NOW()
),

-- 13. Copper Sun Rising (Fiction, Subscription, eBook)
(
  'Copper Sun Rising',
  'Chimamanda Adichie',
  'Set against the backdrop of the Nigerian civil war, a young woman must choose between the safety of silence and the danger of truth.',
  'The morning the soldiers came, Mama was braiding Amara''s hair. The copper sun had barely risen above the palm trees...',
  'Fiction',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.6, 1840,
  0, 1,
  'books/covers/book-13.jpg', 'books/epubs/book-13.epub', NULL,
  32, 'epub', 614400,
  'published', NOW(), NOW()
),

-- 14. The Taxman's Daughter (Finance, Paid, eBook)
(
  'The Taxman''s Daughter',
  'Dr. Amaka Eze',
  'A gripping financial thriller set in the world of tax evasion, offshore accounts, and the young woman who exposes it all.',
  'Everyone in Ikoyi knew Mr. Okafor collected taxes. What nobody knew was where the money actually went...',
  'Finance',
  'PAID', 'ebook', 11.99, 'USD', 4.4, 412,
  0, 0,
  'books/covers/book-14.jpg', 'books/epubs/book-14.epub', NULL,
  24, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 15. Selma Street Blues (Fiction, Paid, eBook)
(
  'Selma Street Blues',
  'Seun Adesanya',
  'Jazz, race, and revolution collide in 1960s Alabama as a young Nigerian exchange student discovers the American civil rights movement.',
  'The trumpet''s cry pierced the humid Alabama night. Chukwuemeka closed his eyes and let the music transport him...',
  'Fiction',
  'PAID', 'ebook', 10.49, 'USD', 4.5, 228,
  1, 0,
  'books/covers/book-15.jpg', 'books/epubs/book-15.epub', NULL,
  20, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 16. Docker on a Budget (Technology, Paid, eBook)
(
  'Docker on a Budget',
  'Kofi Mensah',
  'Deploy production applications with Docker without breaking the bank. Practical guides for startups and solo developers in resource-constrained environments.',
  'You don''t need a Silicon Valley budget to run world-class infrastructure. I deployed my first production container on a $5 VPS...',
  'Technology',
  'PAID', 'ebook', 15.99, 'USD', 4.7, 1520,
  1, 1,
  'books/covers/book-16.jpg', 'books/epubs/book-16.epub', NULL,
  22, 'epub', 716800,
  'published', NOW(), NOW()
),

-- 17. Morning Meditations (Self-Help, Free, eBook)
(
  'Morning Meditations',
  'Wanjiru Mwangi',
  'Start each day with intention. 365 meditations inspired by African proverbs and wisdom traditions, perfect for the modern seeker.',
  'Day 1: The Yoruba say, "However far the stream flows, it never forgets its source." Today, return to your beginning...',
  'Self-Help',
  'FREE', 'ebook', NULL, NULL, 4.5, 5600,
  0, 0,
  'books/covers/book-17.jpg', 'books/epubs/book-17.epub', NULL,
  52, 'epub', 307200,
  'published', NOW(), NOW()
),

-- 18. Queen of the Terrace (Romance, Subscription, eBook)
(
  'Queen of the Terrace',
  'Efua Asante',
  'In the glamorous world of Lagos real estate, a property developer falls for the architect hired to design her most ambitious project.',
  'Chidinma surveyed the rooftop terrace of the unfinished tower. From here, you could see all of Lagos — the chaos and the beauty...',
  'Romance',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.3, 990,
  0, 1,
  'books/covers/book-18.jpg', 'books/epubs/book-18.epub', NULL,
  20, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 19. Little Giants (Children, Free, eBook)
(
  'Little Giants',
  'Ngozi Adeyemi',
  'When tiny Kwame discovers he can talk to animals, he embarks on an epic journey across the Serengeti with a wise old elephant as his guide.',
  'Kwame was the smallest boy in his village, but he had the biggest secret. The animals could hear him, and he could hear them...',
  'Children',
  'FREE', 'ebook', NULL, NULL, 4.9, 2100,
  0, 0,
  'books/covers/book-19.jpg', 'books/epubs/book-19.epub', NULL,
  14, 'epub', 307200,
  'published', NOW(), NOW()
),

-- 20. Grain Routes (Historical, Paid, eBook)
(
  'Grain Routes',
  'Bisi Ogunwale',
  'The forgotten history of the trans-Saharan grain trade and its impact on the rise and fall of African empires from the 11th to 16th centuries.',
  'Long before European ships arrived on African shores, the desert highways hummed with caravans carrying millet, sorghum, and the dreams of empires...',
  'Historical',
  'PAID', 'ebook', 13.99, 'USD', 4.6, 743,
  0, 0,
  'books/covers/book-20.jpg', 'books/epubs/book-20.epub', NULL,
  24, 'epub', 512000,
  'published', NOW(), NOW()
),

-- 21. The VC Playbook (Business, Subscription, eBook)
(
  'The VC Playbook',
  'Tunde Balogun',
  'Inside the world of African venture capital. How to raise funding, build investor relationships, and scale across the continent.',
  'The first rule of fundraising in Africa: don''t pitch a solution. Pitch the problem that keeps 1.4 billion people awake at night...',
  'Business',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.8, 3100,
  0, 1,
  'books/covers/book-21.jpg', 'books/epubs/book-21.epub', NULL,
  16, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 22. Nights in Dakar (Romance, Paid, Audiobook)
(
  'Nights in Dakar',
  'Amina Diallo',
  'A Senegalese musician and a French diplomat navigate love across cultures in the vibrant nightlife of Dakar.',
  'The djembe''s rhythm pulsed through the humid night air of Plateau. Marie-Claire had never heard music that felt like a heartbeat...',
  'Romance',
  'PAID', 'audiobook', 9.49, 'USD', 4.6, 445,
  0, 0,
  'books/covers/book-22.jpg', NULL, 'books/audio/book-22-sample.mp3',
  18, 'mp3', 41943040,
  'published', NOW(), NOW()
),

-- 23. Ansible for Humans (Technology, Paid, eBook)
(
  'Ansible for Humans',
  'Seun Adesanya',
  'Automate your infrastructure the easy way. A friendly, practical guide to Ansible for system administrators and DevOps engineers.',
  'Imagine configuring 100 servers in the time it takes to drink a cup of coffee. That''s not a dream — that''s Ansible...',
  'Technology',
  'PAID', 'ebook', 21.99, 'USD', 4.5, 880,
  0, 0,
  'books/covers/book-23.jpg', 'books/epubs/book-23.epub', NULL,
  20, 'epub', 614400,
  'published', NOW(), NOW()
),

-- 24. Rhymes for Rainy Days (Poetry, Free, eBook)
(
  'Rhymes for Rainy Days',
  'Wanjiru Mwangi',
  'Poems for when the clouds gather and the rain falls. Celebrating the beauty of the rainy season across Africa.',
  'Rain on tin roofs sings a lullaby the city forgot. I press my palm to the window and feel the sky weeping with joy...',
  'Poetry',
  'FREE', 'ebook', NULL, NULL, 4.7, 1200,
  0, 0,
  'books/covers/book-24.jpg', 'books/epubs/book-24.epub', NULL,
  40, 'epub', 204800,
  'published', NOW(), NOW()
),

-- 25. Board Exam Survival (Self-Help, Paid, eBook)
(
  'Board Exam Survival',
  'Kofi Mensah',
  'The ultimate study guide for professional certification exams — strategies, time management, and mental health tips for high-pressure testing.',
  'I failed my first professional exam. Twice. Then I discovered a system that changed everything...',
  'Self-Help',
  'PAID', 'ebook', 6.99, 'USD', 4.4, 3200,
  1, 0,
  'books/covers/book-25.jpg', 'books/epubs/book-25.epub', NULL,
  15, 'epub', 307200,
  'published', NOW(), NOW()
),

-- 26. The Copper Mine (Historical, Subscription, eBook)
(
  'The Copper Mine',
  'Bisi Ogunwale',
  'In colonial-era Zambia, a mine worker and a British engineer''s daughter form an unlikely alliance to expose the true cost of copper.',
  'The shaft descended 400 meters into the earth. Down there, in the copper-red darkness, Mutale could hear the mountain breathing...',
  'Historical',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.5, 670,
  0, 0,
  'books/covers/book-26.jpg', 'books/epubs/book-26.epub', NULL,
  22, 'epub', 512000,
  'published', NOW(), NOW()
),

-- 27. African SF Anthology Vol. 1 (Sci-Fi, Paid, eBook)
(
  'African SF Anthology Vol. 1',
  'Chimamanda Adichie',
  'Twelve visionary short stories imagining Africa''s future — from floating cities above the Sahara to AI-powered traditional medicine.',
  'The year was 2147 and the orbital platform above Kigali hummed with the energy of ten million solar cells...',
  'Sci-Fi',
  'PAID', 'ebook', 16.99, 'USD', 4.8, 1890,
  1, 1,
  'books/covers/book-27.jpg', 'books/epubs/book-27.epub', NULL,
  12, 'epub', 512000,
  'published', NOW(), NOW()
),

-- 28. Smoothie Science (Lifestyle, Paid, eBook)
(
  'Smoothie Science',
  'Efua Asante',
  'Delicious and nutritious smoothie recipes using African superfoods — baobab, moringa, hibiscus, and more.',
  'Chapter 1: The Baobab Blast. Take one tablespoon of baobab powder, a ripe mango, and a handful of cashews...',
  'Lifestyle',
  'PAID', 'ebook', 8.99, 'USD', 4.2, 2100,
  0, 0,
  'books/covers/book-28.jpg', 'books/epubs/book-28.epub', NULL,
  10, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 29. Podcasting Gold (Business, Paid, eBook)
(
  'Podcasting Gold',
  'Tunde Balogun',
  'Turn your podcast into a profitable business. A step-by-step guide covering production, distribution, monetization, and growing an African audience.',
  'The African podcast market is exploding. With 500 million smartphone users on the continent, the opportunity is massive...',
  'Business',
  'PAID', 'ebook', 14.99, 'USD', 4.6, 540,
  0, 0,
  'books/covers/book-29.jpg', 'books/epubs/book-29.epub', NULL,
  14, 'epub', 409600,
  'published', NOW(), NOW()
),

-- 30. Kente & Algorithms (Technology, Subscription, eBook)
(
  'Kente & Algorithms',
  'Kofi Mensah',
  'Exploring the hidden mathematics of traditional African textile patterns and how they inspire modern computing algorithms.',
  'The master weaver never learned calculus, but the fractal patterns in his kente cloth would have made Mandelbrot weep with joy...',
  'Technology',
  'SUBSCRIPTION', 'ebook', NULL, NULL, 4.7, 920,
  0, 0,
  'books/covers/book-30.jpg', 'books/epubs/book-30.epub', NULL,
  16, 'epub', 409600,
  'published', NOW(), NOW()
);
```

---

## Step 5: Generate Cover URLs

After uploading to S3, update each book's `cover_url` column with the **public S3 URL** or **CloudFront URL**:

```sql
-- Replace YOUR_BUCKET.s3.amazonaws.com with your actual S3/CDN domain
UPDATE books SET cover_url = CONCAT('https://YOUR_BUCKET.s3.amazonaws.com/', cover_s3_key) WHERE cover_s3_key IS NOT NULL;
```

Or if using CloudFront:

```sql
UPDATE books SET cover_url = CONCAT('https://cdn.myscriptic.com/', cover_s3_key) WHERE cover_s3_key IS NOT NULL;
```

---

## Step 6: Verify

```sql
-- Check book count
SELECT COUNT(*) as total_books FROM books;
-- Expected: 30

-- Check by category
SELECT category, COUNT(*) as cnt FROM books GROUP BY category ORDER BY cnt DESC;

-- Check by format
SELECT format, COUNT(*) as cnt FROM books GROUP BY format;

-- Check by access type
SELECT access_type, COUNT(*) as cnt FROM books GROUP BY access_type;

-- Check S3 keys populated
SELECT id, title, cover_s3_key, book_file_s3_key, audio_file_s3_key FROM books;
```

### Expected Distribution

| Category | Count |
|----------|-------|
| Fiction | 5 |
| Technology | 5 |
| Self-Help | 3 |
| Romance | 3 |
| Business | 3 |
| Historical | 3 |
| Poetry | 2 |
| Children | 2 |
| Finance | 2 |
| Leadership | 1 |
| Sci-Fi | 1 |

| Access Type | Count |
|-------------|-------|
| PAID | 13 |
| SUBSCRIPTION | 12 |
| FREE | 5 |

| Format | Count |
|--------|-------|
| ebook | 27 |
| audiobook | 3 |

---

## Step 7: Update Categories Endpoint

Ensure `GET /api/books/categories` returns the real data:

```php
// In your CategoriesController or BooksController
public function categories()
{
    $categories = Book::where('status', 'published')
        ->select('category', DB::raw('COUNT(*) as count'))
        ->groupBy('category')
        ->orderByDesc('count')
        ->get()
        ->map(fn($row) => [
            'name' => $row->category,
            'slug' => Str::slug($row->category),
            'count' => $row->count,
        ]);

    return response()->json(['data' => $categories]);
}
```

---

## Notes for Frontend

After this seed is complete:
1. All book covers load from S3/CDN URLs (via `cover_url` in API responses)
2. All book content loads from S3 (via signed URLs → `book_file_s3_key`)
3. Audiobook samples load from S3 (via `audio_file_s3_key`)
4. The frontend mock data is still available as offline fallback when `NEXT_PUBLIC_API_URL` is not set (development only)
5. In production, **no mock data is shown** — everything comes from the API/S3
