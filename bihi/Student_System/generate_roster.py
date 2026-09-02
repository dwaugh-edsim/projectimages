import re
import json
import csv
import random

raw_data = """
Homeroom: 801
Cook, Ruby Aberdeen 3102384520 8
David, Talia Amiyah 3102539206 8
Desveaux, Jason Martin 3102568510 8
Downey, Mae'ijah Terrionna Marie 3102421744 8
Elejorde, Steven Arce 3102474784 8
Gallagher, Zephyr Riley 3102464702 8
Hendricks Apud, Samuel 3102986332 8
King, Kenzie Marie 3102480567 8
Lee, Jayden 3103602789 8
Lorenz-Ashley, Jaela Ruth 3102483421 8
Lucas, Trey Antonio 3103504571 8
MacKay, Ruby Angela 3102474669 8
MacLellan, Samuel Takpo 3102467507 8
Mans, Marieke 3102474560 8
Mercer, Ainslie Jacqueline 3102476011 8
Miller, Juliet Blake 3102488909 8
Miller, Samuel Roy 3102488917 8
O'Brien, Shaviah Josephine 3102510694 8
Ramazanov, Alex 3103386227 8
Santos, Samuel Zacharias Suba 3103770362 8
Sawyer-Patterson, Sydney Jan-Marie 3102474222 8
Schandall, Fiona Deirdre 3102467390 8
Skeete, Nehemiah Isaac 3102469578 8
Stulac, Nikolas Alexander 3102464744 8
Taiani, James Patrick Laurie 3102461492 8
Tylak, Julia Trindade 3102731829 8
Vanslyke, Martin Scott 3102483413 8
Warby, Alex 3102718206 8

Homeroom: 802
Bernard-Hoskin, Aliiza Grace 3102480708 8
Brand, Hendy Milton 3102533548 8
Brennan, Drew Andrew Stewart 3102464694 8
Cahill, Loughlan Patrick 3102461450 8
Chace, Caleb Hunter 3102473711 8
Chukwuji, David Sopuruchi 3103538801 8
Dennis, Hadley Naylor 3102466202 8
Endres, William Thomas Norman 3102479510 8
Foley, Bella Kathryn Lyn 3102482779 8
Giacomantonio, Marcus James 3102482787 8
Glover, Miles James Van 3103331199 8
Greeley, Katie Elizabeth 3102464710 8
Hansford, Myah May Chima 3102529512 8
Harrison, Sam James 3102473729 8
Hatcher-Jack, Sophie Elizabeth 3102461468 8
Kaplin, Misha 3103109363 8
Koubi, Amit 3103467753 8
Lamond, Mairi Bridget 3102461476 8
MacLeod, Michaela St.Clair 3102511320 8
McConnell, Emmet Gregory 3102487349 8
Murphy, Alice Leda 3102464736 8
Richardson, Lena Kelly 3102529397 8
Rutka, Jada Elizabeth Marie 3102490616 8
Savoury, Aria Gail 3102464306 8
Todd, Scarlett Elizabeth Lynne 3102484767 8
Visser, Mikaela Marie 3102564949 8
Wile, Lillian Carmelita 3102464751 8
Williams, Gianna Adalise 3102561093 8

Homeroom: 803
Aabda, Sarah Ataa 3102759978 8
Arzola, Ziegfried Nicolas 3103452862 8
Bambilla, Yohan 3102461880 8
Banerjee, Tiyasha 3103334896 8
Bautista, JL Arce 3102474750 8
Beals, La'Monte Vincenty 3102566241 8
Berringer, Jason Kenneth Albert 3102480336 8
Blois, Beau James 3102461443 8
Boyce, Enid Beatrice 3102508524 8
Coffin, Nev Natalia 3102480542 8
Covert, Evabel Grace Brennan 3102476029 8
Gaudet, Dorian Joseph Dino 3102474792 8
Gibb, Stella Joy 3102491028 8
Holley, Theron Martin 3102490830 8
Jarvis, Alex Leonard 3102482803 8
Kirkwood, Isla Noelle 3102465287 8
Lerdchaisakda, Feng 3103328153 8
Loza, Chandrika 3103500322 8
MacGregor, Drew John Gordon 3102480120 8
MacIntyre, Jon David 3102488503 8
MacNeil-Lapointe, Santaya Serina 3102490863 8
Milner, Amelia Arabelle 3102661562 8
Nadeem, Muhammad Ismael Obierna 3103451948 8
Tkachenko, Elijah Westin 3102339227 8
Tsunoda, Haruki 3103308445 8
Veach, Ben Patrick 3102487331 8
Viernes, Emmanuel Reduca 3102740119 8
Williams, Marley Kaitlin 3102708934 8

Homeroom: 804
Agbeyegbe, Oritshetimehin Oluwapelumi 3103815159 8
Aikens, Jack Robert Kent 3102514969 8
Archibald, Cora Lynn McGregor 3102482399 8
Belhadj Khalifa, Habib 3103512244 8
Bilenko, Vasylyna 3103414078 8
Davis, Theo Samuel Lawrence 3102468562 8
Doak, Caspian Winston 3102748096 8
Donaldson, Margot Penelope 3102474776 8
Doucette, Kate Abigail 3102482761 8
Duplessis-Backland, Heavenly Una Rose 3102330085 8
Gormley, Molly Sarah Elizabeth 3102546557 8
Hickey, Marielle Maeve 3102482795 8
Letarte, Elizabeth Rain 3102575432 8
MacLeod, Cameron Robert 3102491309 8
McFarlane, Charlotte Ivy 3102488495 8
Mellema, Rosie Alice Mooney 3102464728 8
Mique, Ronn Jacob Tumaneng 3103484550 8
Otis Vaillancourt, Oceanne Denise Brigitte 3102659426 8
Palamarchuk, Artem 3103362624 8
Phillips, Max 3102346628 8
Rowles, Sophie Isaac 3102562950 8
Samillano, Jeremiah Mikhael Castro 3102573452 8
Shiha, Hasan 3103048538 8
Sobkowich, Demetrius 3102524737 8
Sparks, Arielle Michelle Annie 3102428152 8
Thompson, Taneil Cameera 3102427915 8
Towns, Charles William 3102473752 8
Younger, Khovin Jeffery 3102485467 8

Homeroom: 901
Alamo MacLennan, Justin Elliot 3102866831 9
Beach, Clara Louise 3102358029 9
Bonin-Townsend, Tess Irene 3102358094 9
Bray, Nova Alice 3102359126 9
Brison, Roselyn Mary 3102356262 9
Cheney, Nolan Karl 3102357914 9
Conlon, Johnny Francis Matthew 3102359464 9
Doherty, Olivia Rayne 3102366949 9
Endres, Abby May 3102347337 9
Fifield, Brielle Lillian 3102329970 9
Grace, Finn Mark Elliott 3102359803 9
Henderson, Aiden Douglas 3102747429 9
Jarvis, Drew Gifford 3102335316 9
Johnson, Trenton Wayne 3102330895 9
Kwak, Doun Kiel 3103200253 9
Latham, Lauren Elizabeth 3102353517 9
Legaarden, Benjamin Murdoch 3102223991 9
Mattatall, Duncan Robert 3102329996 9
Moore, Aurelia Noelle 3102343419 9
Murphy, Jacob Bradley 3102346339 9
Peters, Avery Maurice Kenneth 3102350901 9
Pritchard, Danielle Jennifer 3102335795 9
Purcell, Marty Charles 3102334582 9
Rent, Adie Irene 3102984808 9
Smith, Cameo Elaine 3102361668 9
Sparks, Anastasia Marie 3102251869 9
Towns, Claire Alexandra 3102330010 9
Tretiak, Madeleine Eve 3102364027 9

Homeroom: 902
Alasadi, Mona 3102688037 9
Borromeo, John Henry Ranches 3102359787 9
Brown, Gemma Louise 3102335308 9
Burbridge, Noah Darvesh 3102359795 9
Campbell, Nolan Richard 3102730920 9
Coady, Berlin Navina 3102356270 9
Fleet, Lyla Grace 3102351511 9
Hall, Sebastian Lundin 3102342098 9
Hansford, Tristan Robert 3102361239 9
Heath, Jordan Florido 3102335761 9
Janz, Arlo Edwin Zephyr 3102359977 9
Kuznetsova, Sofia 3103284653 9
Landry, Douglas Gordon 3102426479 9
Lloyd, Marla Hannah Marie 3102405846 9
MacGillivary, Jax William 3102344474 9
MacPhee, Simon Taylor 3102373713 9
Modayur, Daya Bel 3102348756 9
Munroe, Skylar Lynn 3102184193 9
Negus-Dickinson, Zackory William 3102885591 9
Olores, Mhareon Enrique 3102496118 9
Overmars, Thomas Willam 3102406273 9
Pellerin, Morgan Debra Rose 3102353509 9
Pinks, Oscar William Spence 3102479528 9
Rendell, Chelsea Jean 3102330002 9
Skinner, Jordan Amelia 3102390519 9
Strbikova, Sofie 3103679621 9
Strum, Hannah Alexandra 3102342106 9
Tan, Anna Ying Jun 3102224080 9
Turner, Nova Tavia 3103043828 9

Homeroom: 903
Coronel, Misha Arce 3103688218 9
Crawford, Addy Harper 3103001883 9
D'Addario, Walter James 3102967399 9
Donaldson, Oscar Rhys 3102223439 9
Fisher, Avery Allan 3102359845 9
Flaherty, April Elizabeth 3102329988 9
Fost, Ben Cameron 3102385162 9
Giacomantonio, Ava Joyce 3102361247 9
Hussey, Milo Llewellyn 3102364654 9
Kustudic Burke, Bella Sequoia 3102359829 9
Laidlaw, Kenzie Dorothy 3102505082 9
MacDonald, Andrew Michael 3102320128 9
MacDonald, Callum Foster 3102360280 9
MacInnes, Tommy J.M. 3102360421 9
MacLean, Liam James 3102360306 9
Mique, Daphne Ann Tumaneng 3103484576 9
Mizuno, Chie 3103630657 9
Muise, Zoe Gabrielle 3102359902 9
Nguyen, Isaac James 3103012229 9
Nwokoro, Michelle Onyinyechi 3103054189 9
Rendell, Maia Evelyn 3102359837 9
Salcedo, Oliver Jackson 3102348541 9
Samillano, Pauline Castro 3102573460 9
Sampang, Zeiden Quiambao 3102366683 9
Sampson, Patience Rayne-Marie 3102376799 9
Shala, Zana 3102752817 9
Smith, Evan James 3102215641 9
Umeokafor, Blessing Kosisochukwu 3103472845 9
White, Gwenna Mae 3102565573 9
"""

EXCLUDED_CHARS = set("OILF")
BLOCKED_WORDS = {"ASS", "SEX", "WTF", "CUM", "DIE", "FAG", "GAY", "BRA", "TIT", "POO", "PEE", "DAM", "GOD", "GUN"}

ALLOWED_VOWELS = [c for c in "AEU" if c not in EXCLUDED_CHARS]
ALLOWED_CONSONANTS = [c for c in "BCDGHKMNPQRSTVWXYZ" if c not in EXCLUDED_CHARS]
ALLOWED_ALL = ALLOWED_VOWELS + ALLOWED_CONSONANTS

def is_valid_pin(cand):
    if len(cand) != 3:
        return False
    for c in cand:
        if c in EXCLUDED_CHARS or c not in ALLOWED_ALL:
            return False
    if cand in BLOCKED_WORDS:
        return False
    return True

def generate_clean_pins(records):
    used_pins = set()
    random.seed(20260903)
    
    for rec in records:
        last, first = rec['last_name'], rec['first_name']
        
        c_first = "".join([c for c in first.upper() if c in ALLOWED_ALL])
        c_last = "".join([c for c in last.upper() if c in ALLOWED_ALL])
        
        cand = ""
        if len(c_first) >= 2 and len(c_last) >= 1:
            t = c_first[:2] + c_last[0]
            if is_valid_pin(t) and t not in used_pins:
                cand = t
        
        if not cand and len(c_first) >= 1 and len(c_last) >= 2:
            t = c_first[0] + c_last[:2]
            if is_valid_pin(t) and t not in used_pins:
                cand = t
                
        if not cand and len(c_first) >= 1 and len(c_last) >= 1:
            for v in ALLOWED_VOWELS:
                t = c_first[0] + v + c_last[0]
                if is_valid_pin(t) and t not in used_pins:
                    cand = t
                    break
        
        if not cand or cand in used_pins:
            while True:
                c1 = random.choice(ALLOWED_CONSONANTS)
                v = random.choice(ALLOWED_VOWELS)
                c2 = random.choice(ALLOWED_CONSONANTS)
                t = f"{c1}{v}{c2}"
                if is_valid_pin(t) and t not in used_pins:
                    cand = t
                    break
        
        used_pins.add(cand)
        rec['pin'] = cand
        rec['username'] = f"{rec['first_name'].lower().split()[0]}.{cand.lower()}"

# Parse lines
lines = raw_data.strip().split('\n')
current_homeroom = ""
all_students = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    if line.startswith("Homeroom:"):
        current_homeroom = line.split(":")[1].strip()
        continue
    
    match = re.match(r"^(.+?),\s*(.+?)\s+(\d{10})\s+(\d+)$", line)
    if match:
        last_name = match.group(1).strip()
        first_names = match.group(2).strip()
        student_id = match.group(3).strip()
        grade = int(match.group(4).strip())
        
        preferred_first = first_names.split()[0]
        
        # Determine courses taught by Mr. Waugh
        if grade == 9:
            courses = ["CIT 9", "HL 9"]
            course_label = "Citizenship 9 & Healthy Living 9"
        else:
            courses = ["HL 8"]
            course_label = "Healthy Living 8"
        
        all_students.append({
            "homeroom": current_homeroom,
            "grade": grade,
            "last_name": last_name,
            "full_first_name": first_names,
            "first_name": preferred_first,
            "student_id": student_id,
            "courses": courses,
            "course_label": course_label
        })

generate_clean_pins(all_students)

# Save JSON
with open('e:/Antigravity/simroom/Github Repos/projectimages/bihi/Student_System/students_roster.json', 'w') as f:
    json.dump(all_students, f, indent=2)

# Save CSV
with open('e:/Antigravity/simroom/Github Repos/projectimages/bihi/Student_System/students_roster.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["Homeroom", "Grade", "Enrolled Courses", "Last Name", "First Name", "Full Name", "Student ID", "3-Letter PIN", "Username"])
    for s in all_students:
        writer.writerow([
            s['homeroom'],
            s['grade'],
            ", ".join(s['courses']),
            s['last_name'],
            s['first_name'],
            f"{s['first_name']} {s['last_name']}",
            s['student_id'],
            s['pin'],
            s['username']
        ])

print(f"Successfully generated persistent single PINs for {len(all_students)} students across CIT 9 & HL 9/8!")
