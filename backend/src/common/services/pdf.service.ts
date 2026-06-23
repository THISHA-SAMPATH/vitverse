import { Injectable, Logger } from '@nestjs/common';
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a beautifully formatted FFCS Semester Report PDF
   */
  async generateFocReportPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const { user, semester, activities, totalHours, totalCredits, requiredCredits, status, generatedAt } = data;

        // Branding colors
        const primaryColor = '#0052CC';
        const slateDark = '#0F172A';
        const slateLight = '#64748B';
        const borderGray = '#E2E8F0';
        const successColor = '#10B981';
        const warningColor = '#F59E0B';

        // 1. Header Banner
        doc.rect(0, 0, 595.28, 90).fill(primaryColor);
        doc.fillColor('#FFFFFF');
        doc.font('Helvetica-Bold').fontSize(22).text('VITVerse Portal', 40, 25);
        doc.font('Helvetica').fontSize(11).text('Co-Curricular / FFCS Activity Report', 40, 52);

        // Date generated aligned to the right in the banner
        doc.font('Helvetica').fontSize(9).text(`Generated: ${new Date(generatedAt).toLocaleString('en-IN')}`, 400, 40, { align: 'right', width: 155 });

        // 2. Student Info Card
        doc.fillColor(slateDark);
        doc.rect(40, 110, 515, 95).fill('#F8FAFC');
        doc.rect(40, 110, 515, 95).strokeColor(borderGray).lineWidth(1).stroke();

        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(12).text('STUDENT METADATA', 55, 122);

        // Left Column
        doc.font('Helvetica-Bold').fontSize(9.5).text('Name:', 55, 145);
        doc.font('Helvetica').text(user?.name || 'N/A', 140, 145);

        doc.font('Helvetica-Bold').text('Reg Number:', 55, 162);
        doc.font('Helvetica').text(user?.regNumber || 'N/A', 140, 162);

        doc.font('Helvetica-Bold').text('Department:', 55, 179);
        doc.font('Helvetica').text(user?.department || 'N/A', 140, 179);

        // Right Column
        doc.font('Helvetica-Bold').text('Campus:', 300, 145);
        const campusLabel = { VELLORE: 'Vellore', CHENNAI: 'Chennai', AP: 'AP', BHOPAL: 'Bhopal' }[user?.campus as string] || user?.campus || 'N/A';
        doc.font('Helvetica').text(campusLabel, 380, 145);

        doc.font('Helvetica-Bold').text('Semester:', 300, 162);
        doc.font('Helvetica').text(semester || 'N/A', 380, 162);

        doc.font('Helvetica-Bold').text('Year:', 300, 179);
        doc.font('Helvetica').text(user?.year ? `${user.year} Year` : 'N/A', 380, 179);

        // 3. Activities Table
        doc.font('Helvetica-Bold').fontSize(12).text('SUBMITTED FFCS ACTIVITIES', 40, 230);
        
        let y = 252;
        const tableHeaders = ['Activity & Details', 'Type', 'Hours', 'Credits', 'Status'];
        const colWidths = [210, 110, 55, 55, 85];
        const colXs = [40, 250, 360, 415, 470];

        // Draw Table Header Background
        doc.rect(40, y, 515, 22).fill('#E2E8F0');
        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(9);
        for (let i = 0; i < tableHeaders.length; i++) {
          doc.text(tableHeaders[i], colXs[i] + 5, y + 6, { width: colWidths[i] - 10 });
        }
        y += 22;

        // Draw Table Rows
        doc.font('Helvetica').fontSize(8.5);
        if (!activities || activities.length === 0) {
          doc.rect(40, y, 515, 30).fill('#FFFFFF');
          doc.rect(40, y, 515, 30).strokeColor(borderGray).stroke();
          doc.fillColor(slateLight);
          doc.text('No activities logged or approved for this semester.', 50, y + 10, { align: 'center', width: 495 });
          y += 30;
        } else {
          activities.forEach((act: any, index: number) => {
            // Check if page needs to break (A4 height is ~842)
            if (y > 680) {
              doc.addPage();
              y = 40;
              // Re-draw Table Header
              doc.rect(40, y, 515, 22).fill('#E2E8F0');
              doc.fillColor(slateDark);
              doc.font('Helvetica-Bold').fontSize(9);
              for (let i = 0; i < tableHeaders.length; i++) {
                doc.text(tableHeaders[i], colXs[i] + 5, y + 6, { width: colWidths[i] - 10 });
              }
              doc.font('Helvetica').fontSize(8.5);
              y += 22;
            }

            // Alternating backgrounds
            const bg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(40, y, 515, 26).fill(bg);
            doc.rect(40, y, 515, 26).strokeColor(borderGray).lineWidth(0.5).stroke();

            doc.fillColor(slateDark);
            
            // Description & date
            const desc = act.description || act.activityType;
            doc.font('Helvetica-Bold').text(desc.length > 42 ? desc.slice(0, 40) + '...' : desc, colXs[0] + 5, y + 4, { width: colWidths[0] - 10 });
            doc.font('Helvetica').fontSize(7.5).fillColor(slateLight).text(new Date(act.createdAt).toLocaleDateString('en-IN'), colXs[0] + 5, y + 14);

            doc.fontSize(8.5).fillColor(slateDark);
            doc.text(act.activityType, colXs[1] + 5, y + 9, { width: colWidths[1] - 10 });
            doc.text(`${act.hours}h`, colXs[2] + 5, y + 9);
            doc.text(`${act.credits}`, colXs[3] + 5, y + 9);
            
            // Status Tag
            const isApproved = act.status === 'APPROVED' || act.status === 'COMPLETED';
            const statusColor = isApproved ? successColor : act.status === 'REJECTED' ? '#EF4444' : warningColor;
            doc.fillColor(statusColor).font('Helvetica-Bold').text(act.status, colXs[4] + 5, y + 9);

            y += 26;
          });
        }

        // 4. Summary & Verification Cards (Keep together)
        if (y > 550) {
          doc.addPage();
          y = 40;
        }

        y += 15;
        // Total Box
        doc.fillColor('#F8FAFC');
        doc.rect(40, y, 240, 100).fill();
        doc.rect(40, y, 240, 100).strokeColor(borderGray).stroke();
        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(11).text('CREDITS SUMMARY', 55, y + 12);
        
        doc.font('Helvetica').fontSize(9.5).text('Total Co-curricular Hours:', 55, y + 36);
        doc.font('Helvetica-Bold').text(`${totalHours} hrs`, 200, y + 36, { align: 'right', width: 65 });

        doc.font('Helvetica').text('Earned Credits:', 55, y + 54);
        doc.font('Helvetica-Bold').text(`${totalCredits}`, 200, y + 54, { align: 'right', width: 65 });

        doc.font('Helvetica').text('Required Credits:', 55, y + 72);
        doc.font('Helvetica-Bold').text(`${requiredCredits}`, 200, y + 72, { align: 'right', width: 65 });

        // Status Stamp Box
        const isComplete = status === 'COMPLETE' || totalCredits >= requiredCredits;
        const stampBg = isComplete ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)';
        const stampBorder = isComplete ? successColor : warningColor;
        const stampText = isComplete ? 'STATUS: COMPLETION VERIFIED' : 'STATUS: IN PROGRESS';

        doc.fillColor(stampBg);
        doc.rect(295, y, 260, 100).fill();
        doc.rect(295, y, 260, 100).strokeColor(stampBorder).lineWidth(1.5).stroke();

        doc.fillColor(stampBorder).font('Helvetica-Bold').fontSize(12).text(stampText, 310, y + 42, { align: 'center', width: 230 });
        
        doc.fontSize(8).fillColor(slateLight).text(
          isComplete 
            ? 'The student has completed the minimum required 2.0 credits under FFCS / FOC rules.'
            : 'The student has logged activities but is yet to complete the required 2.0 credits.',
          310, y + 62, { align: 'center', width: 230 }
        );

        y += 120;

        // Footer Seal
        doc.lineCap('butt').moveTo(40, y).lineTo(555, y).strokeColor(borderGray).lineWidth(1).stroke();
        
        doc.fillColor(slateLight).font('Helvetica').fontSize(8).text(
          'VITVerse is an official student portal for campus events and clubs integration. This is an automatically generated document based on digital approvals.',
          40, y + 12, { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a beautifully formatted professional Student Resume PDF
   */
  async generateResumePdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const { user, stats, skillRadar, certificates, badges, clubs, recentEvents, topInterests } = data;

        // Formatting configs
        const primaryColor = '#0052CC';
        const accentColor = '#6366F1';
        const slateDark = '#0F172A';
        const slateLight = '#64748B';
        const borderGray = '#E2E8F0';
        const dividerColor = '#E2E8F0';

        // 1. Header with custom layout
        doc.rect(40, 40, 515, 95).fill('#F8FAFC');
        doc.rect(40, 40, 515, 95).strokeColor(borderGray).lineWidth(1).stroke();

        // Banner Left Accent
        doc.rect(40, 40, 8, 95).fill(primaryColor);

        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(20).text(user?.name || 'Student Name', 65, 55);
        doc.font('Helvetica').fontSize(10.5).fillColor(slateLight).text(
          `${user?.regNumber || 'N/A'}  |  ${user?.department || 'N/A'}  |  Year: ${user?.year || 'N/A'}`,
          65, 80
        );
        
        const campusLabel = { VELLORE: 'Vellore', CHENNAI: 'Chennai', AP: 'AP', BHOPAL: 'Bhopal' }[user?.campus as string] || user?.campus || 'N/A';
        doc.text(`Campus: VIT ${campusLabel}  |  Email: ${user?.email || 'N/A'}`, 65, 95);

        // Points Tag inside Banner
        doc.rect(455, 55, 85, 32).fill(primaryColor);
        doc.fillColor('#FFFFFF');
        doc.font('Helvetica-Bold').fontSize(11).text(`${stats?.totalPoints || 0}`, 455, 62, { align: 'center', width: 85 });
        doc.font('Helvetica').fontSize(7.5).text('VITVerse Points', 455, 75, { align: 'center', width: 85 });

        // Columns setup (Two-Column Layout)
        // Left Column (width: 175) -> X: 40 to 215
        // Right Column (width: 320) -> X: 235 to 555
        let leftY = 150;
        let rightY = 150;

        // --- LEFT COLUMN ---
        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(11.5).text('SKILL BREAKDOWN', 40, leftY);
        doc.lineCap('butt').moveTo(40, leftY + 14).lineTo(215, leftY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        leftY += 22;

        const skills = [
          { label: 'Technical Skills', val: skillRadar?.technical || 0 },
          { label: 'Leadership', val: skillRadar?.leadership || 0 },
          { label: 'Management', val: skillRadar?.management || 0 },
          { label: 'Creative', val: skillRadar?.creative || 0 },
          { label: 'Social & Communication', val: skillRadar?.social || 0 },
        ];

        skills.forEach((s) => {
          doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8.5).text(s.label, 40, leftY);
          // Draw horizontal bar
          doc.rect(40, leftY + 12, 175, 6).fill('#F1F5F9');
          const progressWidth = Math.round((s.val / 100) * 175);
          if (progressWidth > 0) {
            doc.rect(40, leftY + 12, progressWidth, 6).fill(primaryColor);
          }
          doc.fillColor(slateLight).font('Helvetica').text(`${Math.round(s.val)}%`, 185, leftY, { align: 'right', width: 30 });
          leftY += 26;
        });

        leftY += 10;

        // Campus Stats
        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(11.5).text('CAMPUS LIFE STATS', 40, leftY);
        doc.lineCap('butt').moveTo(40, leftY + 14).lineTo(215, leftY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        leftY += 22;

        const statItems = [
          { label: 'Events Attended', val: stats?.eventsAttended || 0 },
          { label: 'Clubs Joined', val: stats?.clubsJoined || 0 },
          { label: 'Certificates Earned', val: stats?.certificatesEarned || 0 },
          { label: 'Profile Streaks', val: `${user?.streakDays || 0} Days` }
        ];

        statItems.forEach((item) => {
          doc.fillColor(slateLight).font('Helvetica').fontSize(9).text(item.label, 40, leftY);
          doc.fillColor(slateDark).font('Helvetica-Bold').text(`${item.val}`, 160, leftY, { align: 'right', width: 55 });
          leftY += 18;
        });

        leftY += 15;

        // Earned Badges
        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(11.5).text('EARNED BADGES', 40, leftY);
        doc.lineCap('butt').moveTo(40, leftY + 14).lineTo(215, leftY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        leftY += 22;

        if (!badges || badges.length === 0) {
          doc.fillColor(slateLight).font('Helvetica').fontSize(8.5).text('Participate in events to earn badges.', 40, leftY);
          leftY += 18;
        } else {
          badges.forEach((b: any) => {
            doc.fillColor('#F8FAFC');
            doc.rect(40, leftY, 175, 20).fill();
            doc.rect(40, leftY, 175, 20).strokeColor(borderGray).lineWidth(0.5).stroke();

            const badgeSymbol = { ATTENDANCE: '🎯', VOLUNTEER: '🤝', WINNER: '🏆', ORGANIZER: '📋', MENTOR: '💡', STREAK: '🔥' }[b.type as string] || '🎖️';
            doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8.5).text(`${badgeSymbol}  ${b.label}`, 45, leftY + 5, { width: 165 });
            leftY += 24;
          });
        }

        // --- RIGHT COLUMN ---
        doc.fillColor(slateDark);
        doc.font('Helvetica-Bold').fontSize(11.5).text('CLUB MEMBERSHIPS', 235, rightY);
        doc.lineCap('butt').moveTo(235, rightY + 14).lineTo(555, rightY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        rightY += 22;

        if (!clubs || clubs.length === 0) {
          doc.fillColor(slateLight).font('Helvetica').fontSize(9).text('Not registered in any VIT clubs yet.', 235, rightY);
          rightY += 18;
        } else {
          clubs.forEach((c: any) => {
            doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(9.5).text(c.club.name, 235, rightY);
            doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(8).text(c.role || 'Member', 460, rightY, { align: 'right', width: 95 });
            rightY += 13;
            doc.fillColor(slateLight).font('Helvetica').fontSize(8.5).text(`Category: ${c.club.category}  |  Joined: ${new Date(c.joinedAt).toLocaleDateString('en-IN')}`, 235, rightY);
            rightY += 20;
          });
        }

        rightY += 10;

        // Verified Certificates
        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(11.5).text('VERIFIED CERTIFICATES', 235, rightY);
        doc.lineCap('butt').moveTo(235, rightY + 14).lineTo(555, rightY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        rightY += 22;

        if (!certificates || certificates.length === 0) {
          doc.fillColor(slateLight).font('Helvetica').fontSize(9).text('No event certificates issued.', 235, rightY);
          rightY += 18;
        } else {
          certificates.slice(0, 4).forEach((cert: any) => {
            if (rightY > 480) {
              // Wrap right column to page 2 if needed
              // But we can limit certificates or handle formatting beautifully.
            }
            doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(9.5).text(cert.event?.title || cert.title, 235, rightY, { width: 230 });
            if (cert.verified) {
              doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7.5).text('✓ VERIFIED', 475, rightY, { align: 'right', width: 80 });
            }
            rightY += 13;
            doc.fillColor(slateLight).font('Helvetica').fontSize(8).text(
              `Type: ${cert.type}  |  Date: ${new Date(cert.issuedAt).toLocaleDateString('en-IN')}`,
              235, rightY
            );
            rightY += 10;
            doc.fillColor(slateLight).fontSize(7).text(`Hash: ${cert.hash}`, 235, rightY);
            rightY += 18;
          });
        }

        rightY += 10;

        // Event Attendance History
        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(11.5).text('RECENT EVENT PARTICIPATIONS', 235, rightY);
        doc.lineCap('butt').moveTo(235, rightY + 14).lineTo(555, rightY + 14).strokeColor(dividerColor).lineWidth(1.5).stroke();
        rightY += 22;

        if (!recentEvents || recentEvents.length === 0) {
          doc.fillColor(slateLight).font('Helvetica').fontSize(9).text('No recent event participation records.', 235, rightY);
          rightY += 18;
        } else {
          recentEvents.slice(0, 4).forEach((ev: any) => {
            doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(9.5).text(ev.event?.title, 235, rightY, { width: 240 });
            const evDate = ev.event?.startDateTime || ev.event?.sessions?.[0]?.sessionDate || new Date();
            doc.fillColor(slateLight).font('Helvetica').fontSize(8.5).text(new Date(evDate).toLocaleDateString('en-IN'), 475, rightY, { align: 'right', width: 80 });
            rightY += 13;
            doc.fillColor(slateLight).fontSize(8).text(`Campus: VIT ${ev.event?.campus || campusLabel}`, 235, rightY);
            rightY += 16;
          });
        }

        // Bottom Footer
        const maxY = Math.max(leftY, rightY);
        doc.lineCap('butt').moveTo(40, 770).lineTo(555, 770).strokeColor(dividerColor).lineWidth(1).stroke();
        doc.fillColor(slateLight).font('Helvetica').fontSize(8).text(
          'VITVerse Student Portfolio. Verifiable online profile at vitverse-chi.vercel.app',
          40, 778, { align: 'center', width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
