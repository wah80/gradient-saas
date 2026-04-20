from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from flask_wtf.csrf import CSRFProtect
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import psycopg2 
import json
import os
import secrets
from psycopg2.extras import RealDictCursor
from psycopg2 import errors
import json
from flask import abort
import re
import stripe



app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") # 🔴 secret key

csrf = CSRFProtect(app)

DATABASE_URL = os.environ.get("DATABASE_URL")



def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        return psycopg2.connect(database_url, sslmode="require")
    else:
        # Local fallback
        return psycopg2.connect(
            dbname="gradientsaas",
            user="gradientsaas_user",
            password="12345abc",
            host="localhost",
            port="5432"
        )
# Database helper

def build_email_template(title, message, button_text=None, button_link=None):

    return f"""
    <div style="font-family:Arial, sans-serif; background:#f5f5f5; padding:20px;">
        
        <div style="max-width:500px; margin:auto; background:white; border-radius:10px; padding:20px;">

            <h2 style="color:#ff0240; text-align:center;">
                Gradient SaaS
            </h2>

            <h3 style="color:#333;">
                {title}
            </h3>

            <p style="color:#555; line-height:1.5;">
                {message}
            </p>

            {f'''
            <div style="text-align:center; margin:20px 0;">
                <a href="{button_link}" 
                   style="background:#000; color:#fff; padding:10px 20px; 
                          text-decoration:none; border-radius:5px;">
                   {button_text}
                </a>
            </div>
            ''' if button_text else ''}

            <hr>

            <p style="font-size:12px; color:#999; text-align:center;">
                © 2026 Gradient SaaS. All rights reserved.
            </p>

        </div>
    </div>
    """



def create_tables():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS palettes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        gradient_type TEXT,
        angle INTEGER,
        radial_shape TEXT,
        center_x INTEGER,
        center_y INTEGER,
        colors TEXT,
        UNIQUE(user_id, name)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments  (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255),
        amount NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stripe_events (
        id TEXT PRIMARY KEY
    );
    """)
        
    conn.commit()
    conn.close()
    
    
# Call the function at startup
create_tables()



    
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

import re

def generate_unique_slug(name, cursor):

    # Basic slug
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')

    base_slug = slug
    counter = 2

    while True:

        cursor.execute(
            "SELECT id FROM palettes WHERE slug=%s",
            (slug,)
        )

        existing = cursor.fetchone()

        if not existing:
            break

        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug
 
def admin_required(f):
    from functools import wraps

    @wraps(f)
    def wrapper(*args, **kwargs):

        

        if session.get("role") != "admin":
            return "Unauthorized", 403

        return f(*args, **kwargs)

    return wrapper
 
    

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

import colorsys

def hex_to_rgb(hex_color):
    hex_color = hex_color.replace("#", "").strip()

    # Safety check (fix your previous error 🔥)
    if len(hex_color) != 6:
        return None

    try:
        r = int(hex_color[0:2], 16) / 255
        g = int(hex_color[2:4], 16) / 255
        b = int(hex_color[4:6], 16) / 255
        return r, g, b
    except:
        return None


def get_color_tags(colors):
    tags = set()

    for hex_color in colors:
        rgb = hex_to_rgb(hex_color)
        if not rgb:
            continue

        h, l, s = colorsys.rgb_to_hls(*rgb)

        h = h * 360
        l = l * 100
        s = s * 100

        # 🎨 COLOR DETECTION
        if h < 15 or h > 345:
            tags.add("red")
        elif 15 <= h < 45:
            tags.add("orange")
        elif 45 <= h < 70:
            tags.add("yellow")
        elif 70 <= h < 160:
            tags.add("green")
        elif 160 <= h < 250:
            tags.add("blue")
        elif 250 <= h < 290:
            tags.add("purple")
        elif 290 <= h < 345:
            tags.add("pink")

        # 🌗 LIGHT / DARK
        if l < 25:
            tags.add("dark")
        elif l > 75:
            tags.add("light")

        # 🎯 SATURATION
        if s < 20:
            tags.add("muted")
        elif s > 70:
            tags.add("vibrant")

    return ",".join(tags)

import smtplib
from email.mime.text import MIMEText

def send_email(to_email, subject, body):

    sender_email = "guesthousechl@gmail.com"
    sender_password = "mtfu wpdz pwbm jidu"  # ⚠️ NOT normal password

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()

        print("📧 Email sent to:", to_email)

    except Exception as e:
        print("❌ Email error:", str(e))



# Register route
from psycopg2 import errors

@csrf.exempt
@app.route("/register", methods=["GET", "POST"])
def register():
    
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = generate_password_hash(request.form.get("password"))

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
                (username, email, password)
            )
            conn.commit()

        except errors.UniqueViolation:
            conn.rollback()   # ✅ rollback first
            conn.close()      # ✅ close connection
            return render_template("register.html", error="Email already exists")

        except Exception as e:
            conn.rollback()
            conn.close()
            print("REGISTER ERROR:", e)
            return render_template("register.html", error="Something went wrong")

        conn.close()
        return redirect("/login")

    return render_template("register.html")

#root Function
@app.route("/")
def home():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name, slug, gradient_type, angle, colors
        FROM palettes
        WHERE public=TRUE
        ORDER BY id DESC
        LIMIT 8
    """)

    rows = cursor.fetchall()

    gradients = [
        {
            "name": r[0],
            "slug": r[1],
            "gradient_type": r[2],
            "angle": r[3],
            "colors": json.loads(r[4])
        }
        for r in rows
    ]

    conn.close()

    return render_template("home.html", gradients=gradients, user_plan=session.get("user_plan", "free") )

# Login route
@csrf.exempt
@app.route("/login", methods=["GET", "POST"])
@limiter.limit("30 per minute")
def login():

    error = ""

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, username, password, role FROM users WHERE email=%s",
            (email,)
        )

        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user[2], password):

            session["user_id"] = user[0]
            session["username"] = user[1]
            session["role"] = user[3]   # ✅ FIXED

            print("ROLE:", user[3])

            if user[3] == "admin":
                print("Redirecting to admin panel")
                return redirect("/admin")

            return redirect("/dashboard")

        else:
            error = "Invalid email or password"

    return render_template("login.html", error=error)
# Dashboard route
@app.route("/dashboard")
@login_required
def dashboard():
    
    if session.get("role") == "admin":
        return redirect("/admin")
        
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM palettes WHERE user_id=%s", (session["user_id"],))
    rows = cursor.fetchall()
    
    palettes = []
    for row in rows:
        palette = list(row)

        # 🔥 Safe decoding
        if isinstance(palette[8], str):
            palette[8] = json.loads(palette[8])

        palettes.append(palette)

    cursor.execute(
        "SELECT plan FROM users WHERE id=%s",
        (session["user_id"],)
    )
    user_plan = cursor.fetchone()[0]
        
    cursor.execute(
        "SELECT COUNT(*) FROM palettes WHERE user_id=%s",
        (session["user_id"],)
    )
    palette_count = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT plan, payment_failed 
        FROM users WHERE id=%s
    """, (session["user_id"],))

    user = cursor.fetchone()
    user_plan = user[0]
    payment_failed = user[1]
    
    conn.close()
    # Plan limits
    palette_limit = 5 if user_plan == "free" else 9999
    
    return render_template(
    "dashboard.html",
    palettes=palettes,
    username=session.get("username"),
    user_plan=user_plan,
    payment_failed=payment_failed,
    palette_count=palette_count,
    palette_limit=palette_limit
    )
    

#Save Gradient route
@app.route("/save-gradient", methods=["POST"])
def save_gradient():

    if "user_id" not in session:
        return {"error":"Unauthorized"}, 401

    data = request.json

    settings = data["settings"]

    if settings["type"] == "linear":
        gradient_css = f"linear-gradient({settings['angle']}deg, {','.join(settings['colors'])})"
    else:
        gradient_css = f"radial-gradient(circle, {','.join(settings['colors'])})"

    conn = get_db_connection()
    conn.execute(
        "INSERT INTO gradients (user_id,name,settings) VALUES (%s,%s,%s)",
        (session["user_id"], data["name"], gradient_css)
    )
    conn.commit()

    return {"success":True}

# Admin route
from datetime import datetime, timedelta

@app.route("/admin")
@admin_required
def admin_dashboard():

    conn = get_db_connection()
    cursor = conn.cursor()

    # 👥 Total users
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    # 💎 Pro users
    cursor.execute("SELECT COUNT(*) FROM users WHERE plan='pro'")
    pro_users = cursor.fetchone()[0]

    # 🆓 Free users
    cursor.execute("SELECT COUNT(*) FROM users WHERE plan='free'")
    free_users = cursor.fetchone()[0]

    # 🎨 Total palettes
    cursor.execute("SELECT COUNT(*) FROM palettes")
    total_palettes = cursor.fetchone()[0]

    # 📈 Last 7 days signup data
    labels = []
    data = []

    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")

        cursor.execute("""
            SELECT COUNT(*) FROM users
            WHERE DATE(created_at) = %s
        """, (day_str,))

        count = cursor.fetchone()[0]

        labels.append(day.strftime("%d %b"))
        data.append(count)
    
 

    # 💰 Total revenue
    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payments")
    total_revenue = cursor.fetchone()[0]

    # 📅 Last 7 days revenue
    rev_labels = []
    rev_data = []

    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE DATE(created_at) = %s
        """, (day_str,))

        amount = cursor.fetchone()[0]

        rev_labels.append(day.strftime("%d %b"))
        rev_data.append(float(amount))
    
    conn.close()

    return render_template(
        "admin/dashboard.html",
        total_users=total_users,
        pro_users=pro_users,
        free_users=free_users,
        total_palettes=total_palettes,
        chart_labels=labels,
        chart_data=data,
        total_revenue=total_revenue,
        rev_labels=rev_labels,
        rev_data=rev_data
    )
                           
                           
# Logout route
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))
    
#User Pro
@app.route("/admin/make-pro/<int:user_id>")
@admin_required
def make_pro(user_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users SET plan='pro' WHERE id=%s
    """, (user_id,))

    conn.commit()
    conn.close()

    return redirect("/admin")
    
#User Delete    
@app.route("/admin/delete/<int:user_id>")
@admin_required
def delete_user(user_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))

    conn.commit()
    conn.close()

    return redirect("/admin")

  
    
# Save Palettes route    

@app.route("/save_palette", methods=["POST"])
def save_palette():
    if "user_id" not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "Invalid request"}), 400
        
    name = data.get("name")

    if not name or not isinstance(name, str):
        return jsonify({"status": "error", "message": "Invalid palette name"}), 400

    if len(name.strip()) == 0 or len(name) > 50:
        return jsonify({"status": "error", "message": "Name must be 1–50 characters"}), 400

    if not isinstance(data.get("colors"), list) or len(data["colors"]) == 0:
        return jsonify({"status": "error", "message": "At least one color required"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()

    # 🔥 Check duplicate name for this user
    cursor.execute(
        "SELECT id FROM palettes WHERE user_id=%s AND name=%s",
        (session["user_id"], data["name"])
    )

    existing = cursor.fetchone()

    if existing:
        conn.close()   # ✅ CLOSE CONNECTION
        return jsonify({
            "status": "error",
            "message": "Palette name already exists"
        })
    cursor.execute(
        "SELECT COUNT(*) FROM palettes WHERE user_id=%s",
        (session["user_id"],)
    )
    count = cursor.fetchone()[0]

    cursor.execute(
        "SELECT plan FROM users WHERE id=%s",
        (session["user_id"],)
    )
    user_plan = cursor.fetchone()[0]

    if user_plan == "free" and count >= 5:
        conn.close()
        return jsonify({
        "status": "error",
        "message": "Free plan limit reached. Upgrade to Pro."
    })
    if user_plan == "free" and data["gradient_type"] == "radial":
        conn.close()
        return jsonify({"status": "error","message": "Radial gradients are Pro feature."}), 403
    colors = data.get("colors")
    gradient_type = data.get("gradient_type")
    angle = data.get("angle")
    public = data.get("public", False)
    slug = generate_unique_slug(data["name"], cursor)
    tags = get_color_tags(colors)
    
       
    cursor.execute("""
    INSERT INTO palettes 
    (name, slug, gradient_type, angle, colors, tags, public, user_id)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
    name,
    slug,
    gradient_type,
    angle,
    json.dumps(colors),
    tags,
    public,
    session["user_id"]   
    ))
    
    
    conn.commit()
    conn.close()

    return jsonify({"status": "success"})

# Delete Palettes

@app.route("/delete_palette/<int:palette_id>", methods=["POST"])
def delete_palette(palette_id):
    if "user_id" not in session:
        return jsonify({"status": "error"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM palettes WHERE id=%s AND user_id=%s",
                   (palette_id, session["user_id"]))

    conn.commit()
    conn.close()

    return jsonify({"status": "success"})

# Get palette
@app.route("/get_palette/<int:palette_id>")
def get_palette(palette_id):
    if "user_id" not in session:
        return jsonify({"status": "error"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM palettes WHERE id=%s AND user_id=%s",
                   (palette_id, session["user_id"]))

    palette = cursor.fetchone()
    conn.close()

    return jsonify({
        "id": palette[0],
        "name": palette[2],
        "gradient_type": palette[3],
        "angle": palette[4],
        "radial_shape": palette[5],
        "center_x": palette[6],
        "center_y": palette[7],
        "colors": json.loads(palette[8])
    })

@app.route("/update_palette/<int:palette_id>", methods=["POST"])
def update_palette(palette_id):
    if "user_id" not in session:
        return jsonify({"status": "error"}), 401

    data = request.json
    # 🔐 INPUT VALIDATION START

    if not data:
        return jsonify({"status": "error", "message": "Invalid request"}), 400
       
    
    name = data.get("name")

    if not name or not isinstance(name, str):
        return jsonify({"status": "error", "message": "Invalid palette name"}), 400

    if len(name.strip()) == 0 or len(name) > 50:
        return jsonify({"status": "error", "message": "Name must be 1–50 characters"}), 400

    if not isinstance(data.get("colors"), list) or len(data["colors"]) == 0:
        return jsonify({"status": "error", "message": "At least one color required"}), 400
          
# 🔐 INPUT VALIDATION END

    conn = get_db_connection()
    cursor = conn.cursor()

    # 🔥 Check duplicate name (excluding current palette)
    cursor.execute("""
        SELECT id FROM palettes
        WHERE user_id=%s AND name=%s AND id != %s
    """, (session["user_id"], data["name"], palette_id))

    existing = cursor.fetchone()
    
    if existing:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "Palette name already exists"
        })
    cursor.execute(
        "SELECT plan FROM users WHERE id=%s",
        (session["user_id"],)
    )
    user_plan = cursor.fetchone()[0]
    if user_plan == "free" and data.get("gradient_type") == "radial":
        conn.close()
        return jsonify({
            "status": "error",
            "message": "Radial gradients are Pro feature."
            }), 403 
    
    # ✅ Now safe to update
    cursor.execute("""
        UPDATE palettes
        SET name=%s, gradient_type=%s, angle=%s, radial_shape=%s, center_x=%s, center_y=%s, colors=%s
        WHERE id=%s AND user_id=%s
    """, (
        data["name"],
        data["gradient_type"],
        data["angle"],
        data["radial_shape"],
        data["center_x"],
        data["center_y"],
        json.dumps(data["colors"]),
        palette_id,
        session["user_id"]
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({"status": "success"})



@app.route("/gradients")
def public_gallery():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id,name,slug,gradient_type,angle,colors
        FROM palettes
        WHERE public=TRUE
        ORDER BY id DESC
        LIMIT 100
    """)

    rows = cursor.fetchall()

    gradients = []

    for r in rows:
        gradients.append({
        "id": r[0],
        "name": r[1],
        "slug": r[2],
        "gradient_type": r[3],
        "angle": r[4],
        "colors": json.loads(r[5])   # 🔥 decode JSON
    })

    conn.close()

    return render_template("gallery.html", gradients=gradients)


@app.route("/gradient/<slug>")
def gradient_page(slug):

    conn = get_db_connection()
    cursor = conn.cursor()

    # Current gradient
    cursor.execute("""
        SELECT id,name,slug,gradient_type,angle,colors
        FROM palettes
        WHERE slug=%s AND public=TRUE
    """,(slug,))

    row = cursor.fetchone()

    if not row:
        abort(404)

    gradient = {
        "id": row[0],
        "name": row[1],
        "slug": row[2],
        "gradient_type": row[3],
        "angle": row[4],
        "colors": json.loads(row[5])
    }

    # 🔥 Related gradients (exclude current)
    cursor.execute("""
        SELECT name,slug,gradient_type,angle,colors
        FROM palettes
        WHERE public=TRUE AND slug!=%s
        ORDER BY RANDOM()
        LIMIT 6
    """,(slug,))

    rows = cursor.fetchall()

    related = []

    for r in rows:
        related.append({
            "name": r[0],
            "slug": r[1],
            "gradient_type": r[2],
            "angle": r[3],
            "colors": json.loads(r[4])
        })

    conn.close()

    return render_template(
        "gradient_page.html",
        gradient=gradient,
        related=related
    )

@app.route("/top-gradients")
def top_gradients():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name,slug,gradient_type,angle,colors
        FROM palettes
        WHERE public=TRUE
        ORDER BY id DESC
        LIMIT 100
    """)

    rows = cursor.fetchall()

    gradients = []

    for r in rows:
        gradients.append({
            "name": r[0],
            "slug": r[1],
            "gradient_type": r[2],
            "angle": r[3],
            "colors": json.loads(r[4])
        })

    conn.close()

    return render_template("top_gradients.html", gradients=gradients)

@app.route("/random-gradient")
def random_gradient():
    return render_template("random_gradient.html")

import random

@app.route("/api/random-gradient")
@limiter.limit("60 per minute")
def api_random_gradient():

    colors = [
        "#ff6a00", "#ee0979",
        "#36d1dc", "#5b86e5",
        "#ff9966", "#ff5e62",
        "#00c6ff", "#0072ff",
        "#f7971e", "#ffd200"
    ]

    color1 = random.choice(colors)
    color2 = random.choice(colors)

    angle = random.randint(0,360)

    gradient_css = f"background: linear-gradient({angle}deg, {color1}, {color2});"

    return {
        "type": "linear",
        "angle": angle,
        "colors": [color1, color2],
        "css": gradient_css
    }

@app.route("/api/random-gradient-db")
def api_random_gradient_db():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT gradient_type,angle,colors
        FROM palettes
        WHERE public=TRUE
        ORDER BY RANDOM()
        LIMIT 1
    """)

    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error":"No gradients available"}

    colors = json.loads(row[2])

    if row[0] == "linear":
        css = f"background: linear-gradient({row[1]}deg, {','.join(colors)});"
    else:
        css = f"background: radial-gradient(circle, {','.join(colors)});"

    return {
        "type": row[0],
        "angle": row[1],
        "colors": colors,
        "css": css
    }

@app.route("/gradients/<color>")
def gradients_by_color(color):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name, slug, gradient_type, angle, colors
        FROM palettes
        WHERE public = TRUE AND tags ILIKE %s
        ORDER BY id DESC
    """, (f"%{color}%",))

    import json

    gradients = [
        {
            "name": r[0],
            "slug": r[1],
            "gradient_type": r[2],
            "angle": r[3],
            "colors": json.loads(r[4])
        }
        for r in cursor.fetchall()
    ]

       
    conn.close()
    
    
    return render_template(
        "color_gradients.html",
        gradients=gradients,
        color=color
    )
    
   
    
   
@app.route("/api-docs")
def api_docs():
    return render_template("api_docs.html")    
    

@app.route("/pricing")
def pricing():
    return render_template("pricing.html")


@app.route("/upgrade")
@login_required
def upgrade():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET plan='pro' WHERE id=%s",
        (session["user_id"],)
    )

    conn.commit()
    conn.close()

    return redirect("/dashboard")


@app.route("/create-checkout-session")
@login_required
@limiter.limit("10 per minute")
def create_checkout_session():

    user_id = session["user_id"]

    try:
        checkout = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='subscription',

            line_items=[{
                'price': os.environ.get("STRIPE_PRICE_ID"),  # ✅ use price ID (IMPORTANT)
                'quantity': 1,
            }],

            success_url=f"{DOMAIN}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{DOMAIN}/pricing",

            metadata={
                "user_id": str(user_id)
            }
        )

        return redirect(checkout.url)

    except Exception as e:
        print("❌ Stripe Checkout Error:", str(e))
        return "Payment service error", 500


@app.route("/success")
def success():
    return "<h2>Payment successful! 🎉</h2><a href='/dashboard'>Go to Dashboard</a>"

@csrf.exempt
@app.route("/stripe-webhook", methods=["POST"])
def stripe_webhook():

    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except Exception as e:
        print("❌ Webhook Error:", str(e))
        return str(e), 400

    print("✅ Event:", event["type"])
    
    # =====================================
    # 🔐 IDEMPOTENCY CHECK 
    # =====================================
    conn = get_db_connection()
    cursor = conn.cursor()

    event_id = event["id"]

    cursor.execute(
        "SELECT id FROM stripe_events WHERE id=%s",
        (event_id,)
    )
    if cursor.fetchone():
        conn.close()
        return "", 200   # ✅ already processed

    cursor.execute(
        "INSERT INTO stripe_events (id) VALUES (%s)",
        (event_id,)
    )
    conn.commit()

    # ==============================
    # 🎉 PAYMENT SUCCESS
    # ==============================
    if event["type"] == "checkout.session.completed":

        session_data = event["data"]["object"]

        user_id = session_data["metadata"]["user_id"]
        customer_id = session_data["customer"]
        subscription_id = session_data["subscription"]
        
        
        conn = get_db_connection()
        cursor = conn.cursor()

        # ✅ get user email FIRST
        cursor.execute("SELECT email FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        user_email = user[0] if user else None

        # ✅ update user
        cursor.execute("""
            UPDATE users 
            SET plan='pro',
                stripe_customer_id=%s,
                stripe_subscription_id=%s
            WHERE id=%s
        """, (customer_id, subscription_id, user_id))

        conn.commit()
        conn.close()

        if user_email:
            send_email(
                user_email,
                "🎉 Welcome to Pro!",
                build_email_template(
                    "You're now Pro 🚀",
                    "You now have access to unlimited gradients.",
                    "Start Creating",
                    "http://127.0.0.1:5000/dashboard"
                )
            )

    # ==============================
    # ❌ SUBSCRIPTION CANCELLED
    # ==============================
    elif event["type"] == "customer.subscription.deleted":

        sub = event["data"]["object"]
        customer_id = sub["customer"]
        
        
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT email FROM users WHERE stripe_customer_id=%s
        """, (customer_id,))
        user = cursor.fetchone()
        user_email = user[0] if user else None

        cursor.execute("""
            UPDATE users 
            SET plan='free',
                stripe_subscription_id=NULL
            WHERE stripe_customer_id=%s
        """, (customer_id,))

        conn.commit()
        conn.close()

        if user_email:
            send_email(
                user_email,
                "Subscription Cancelled",
                build_email_template(
                    "Sorry to see you go 😢",
                    "Your subscription has been cancelled.",
                    "Upgrade Again",
                    "http://127.0.0.1:5000/pricing"
                )
            )

    # ==============================
    # ❌ PAYMENT FAILED
    # ==============================
    elif event["type"] in ["invoice.payment_failed", "payment_intent.payment_failed"]:

        obj = event["data"]["object"]
        customer_id = obj.get("customer")

        if not customer_id:
            print("❌ No customer_id found")
            return "", 200

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT email FROM users WHERE stripe_customer_id=%s
        """, (customer_id,))
        user = cursor.fetchone()
        user_email = user[0] if user else None

        cursor.execute("""
            UPDATE users 
            SET payment_failed=TRUE
            WHERE stripe_customer_id=%s
        """, (customer_id,))

        conn.commit()
        conn.close()

        print("⚠️ Payment failed:", customer_id)

        if user_email:
            send_email(
                user_email,
                "⚠️ Payment Failed",
                build_email_template(
                    "Payment Failed",
                    "We couldn’t process your payment.",
                    "Fix Payment",
                    "http://127.0.0.1:5000/billing-portal"
                )
            )

    # ==============================
    # ✅ PAYMENT RECOVERED
    # ==============================
    elif event["type"] == "invoice.payment_succeeded":

        invoice = event["data"]["object"]

        customer_id = invoice["customer"]
        amount_paid = invoice["amount_paid"] / 100  # convert cents → dollars
        currency = invoice["currency"]
        created = datetime.fromtimestamp(invoice["created"])

        conn = get_db_connection()
        cursor = conn.cursor()
        user_email =  None
        
        # ✅ store revenue
        cursor.execute("""
            INSERT INTO payments (customer_id, amount, created_at)
            VALUES (%s, %s, %s)
        """, (customer_id, amount_paid, created))

        # ✅ mark user payment OK
        cursor.execute("""
            UPDATE users 
            SET payment_failed=FALSE
            WHERE stripe_customer_id=%s
        """, (customer_id,))
        
        
        
        conn.commit()
        conn.close()

        print("💰 Revenue recorded:", amount_paid)

        if user_email:
            send_email(
                user_email,
                "✅ Payment Successful",
                build_email_template(
                    "Payment Fixed 🎉",
                    "Your payment is working again.",
                    "Go to Dashboard",
                    "http://127.0.0.1:5000/dashboard"
                )
            )

    return "", 200


    
@app.route("/billing-portal")
@login_required
def billing_portal():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT stripe_customer_id FROM users WHERE id=%s",
        (session["user_id"],)
    )

    customer = cursor.fetchone()
    customer_id = customer[0] if customer else None
    conn.close()

    # ❌ No customer → block
    if not customer_id:
        return redirect("/pricing")

    portal = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{DOMAIN}/dashboard"
    )

    return redirect(portal.url)


  

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=False,  # True when using HTTPS
    SESSION_COOKIE_SAMESITE="Lax"
    )   

   
# Main 
if __name__ == "__main__":
    app.run()




