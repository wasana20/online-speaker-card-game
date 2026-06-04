import re
path = r'c:\Users\TR\Desktop\hw_uoa\Y2_S1\Capstone\speaker-game\src\pages\RecorderPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
# Replace Unicode quotes with ASCII
content = content.replace(u'\u201c', '"')  # Left double quote
content = content.replace(u'\u201d', '"')  # Right double quote
content = content.replace(u'\u2018', "'")  # Left single quote  
content = content.replace(u'\u2019', "'")  # Right single quote
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed Unicode quotes')
