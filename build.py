from pathlib import Path
p=Path(__file__).resolve().parent
s=(p/'layout.html').read_text()
data='\n'.join((p/f).read_text() for f in ['data.js','region-data.js','forecast-data.js'])
app='\n'.join((p/f).read_text() for f in ['app.js','region-app.js','forecast-app.js'])
html=s.replace('/*DATA*/',data).replace('/*APP*/',app)
for name in ['index.html','one-to-one-offline.html']:(p/name).write_text(html)
