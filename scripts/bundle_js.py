import json

raw = json.load(open('scripts/all_spoken_english_days1_to_6.json', encoding='utf-8'))
by_key = {}

for item in raw:
    key = str(item['class']) + "||" + str(item['day'])
    by_key[key] = {
        'class': item['class'],
        'day': item['day'],
        'day_label': item['day_label'],
        'title': item['title'],
        'raw_title': item['raw_title'],
        'objective': item['objective'],
        'video_url': item['video_url'],
        'checklist': item['checklist'],
        'tables': item['tables'],
        'full_content': item['full_content']
    }

js_content = 'window.SpokenEnglishData = ' + json.dumps(by_key, ensure_ascii=False) + ';\n'
with open('Portal/data/spoken-english-lessons.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print('Wrote Portal/data/spoken-english-lessons.js with', len(by_key), 'lessons')
