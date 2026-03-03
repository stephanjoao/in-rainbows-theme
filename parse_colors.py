import json
import re

def extrair_seis_apos_hash(json_input):
    # Se for string JSON, converte para texto
    if isinstance(json_input, dict) or isinstance(json_input, list):
        texto = json.dumps(json_input)
    else:
        texto = str(json_input)

    # Regex: # seguido de exatamente 6 caracteres
    padrao = r"#([0-9a-fA-F]+)"
    
    resultados = re.findall(padrao, texto)
    
    return resultados


# Exemplo de uso
if __name__ == "__main__":
    exemplo_json = json.load(open('themes/dark.json'))

    lista = extrair_seis_apos_hash(exemplo_json)
    cores = set(lista)  # Usar set para evitar duplicatas
    print(cores)